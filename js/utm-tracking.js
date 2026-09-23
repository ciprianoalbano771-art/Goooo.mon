/**
 * UTM Tracking - Captura, persiste e propaga UTMs em todas as etapas
 *
 * Camadas:
 *  1. Captura UTMs / click IDs da URL e salva em sessionStorage + cookie 1ª parte
 *  2. Propaga em qualquer link <a> da página (auto-append on load)
 *  3. MutationObserver: detecta o botão CTA injetado pelo player vturb e
 *     reescreve o href com as UTMs preservadas
 *  4. Fallback de click: intercepta clique no CTA caso o href não tenha sido reescrito a tempo
 *
 * Carregue ANTES do script.js para garantir que UTMs sejam capturadas no início.
 */

(function () {
    'use strict';

    // Parâmetros que queremos preservar (UTMs + click IDs de tráfego pago)
    const TRACKED_PARAMS = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'utm_id', 'utm_source_platform',
        'fbclid', 'gclid', 'ttclid', 'msclkid', 'wbraid', 'gbraid',
        'sck', 'xcod', 'src', 'ref'
    ];

    const STORAGE_KEY = 'tracking_params';
    const COOKIE_NAME = 'tracking_params';
    const COOKIE_DAYS = 30;

    // Domínios externos onde devemos injetar UTMs (checkout / pagamento)
    const EXTERNAL_CHECKOUT_HOSTS = [
        'smoopay.app',                    // plataforma de pagamento principal
        'paystack-premium.vercel.app',    // CTA atual configurado no vturb
        'vercel.app'                      // fallback p/ qualquer subdomínio Vercel intermediário
    ];

    // ==================== CAPTURA & PERSISTÊNCIA ====================

    function getParamsFromUrl() {
        const params = {};
        const search = new URLSearchParams(window.location.search);
        TRACKED_PARAMS.forEach(key => {
            const value = search.get(key);
            if (value) params[key] = value;
        });
        return params;
    }

    function getStoredParams() {
        try {
            const fromSession = sessionStorage.getItem(STORAGE_KEY);
            if (fromSession) return JSON.parse(fromSession);
        } catch (e) { /* noop */ }

        try {
            const match = document.cookie.match(new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]*)'));
            if (match) return JSON.parse(decodeURIComponent(match[1]));
        } catch (e) { /* noop */ }

        return {};
    }

    function saveParams(params) {
        if (!params || Object.keys(params).length === 0) return;

        try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(params)); } catch (e) { /* noop */ }

        try {
            const expires = new Date(Date.now() + COOKIE_DAYS * 864e5).toUTCString();
            const value = encodeURIComponent(JSON.stringify(params));
            document.cookie = `${COOKIE_NAME}=${value}; expires=${expires}; path=/; SameSite=Lax`;
        } catch (e) { /* noop */ }
    }

    // Mescla URL atual com storage. URL tem prioridade (visita mais recente vence).
    function resolveParams() {
        const fromUrl = getParamsFromUrl();
        const fromStorage = getStoredParams();
        const merged = Object.assign({}, fromStorage, fromUrl);
        saveParams(merged);
        return merged;
    }

    const trackingParams = resolveParams();
    window.__trackingParams = trackingParams;

    function hasParams() {
        return Object.keys(trackingParams).length > 0;
    }

    // ==================== INJEÇÃO EM URLs ====================

    function appendParamsToUrl(rawUrl) {
        if (!rawUrl || !hasParams()) return rawUrl;
        if (rawUrl.startsWith('#') || rawUrl.startsWith('mailto:') || rawUrl.startsWith('tel:') || rawUrl.startsWith('javascript:')) {
            return rawUrl;
        }

        try {
            const url = new URL(rawUrl, window.location.origin);
            Object.keys(trackingParams).forEach(key => {
                // Não sobrescreve se o link já tem o parâmetro (intenção explícita do dev)
                if (!url.searchParams.has(key)) {
                    url.searchParams.set(key, trackingParams[key]);
                }
            });
            return url.toString();
        } catch (e) {
            return rawUrl;
        }
    }

    function isCheckoutHost(href) {
        try {
            const url = new URL(href, window.location.origin);
            return EXTERNAL_CHECKOUT_HOSTS.some(host => url.hostname.endsWith(host));
        } catch (e) {
            return false;
        }
    }

    // ==================== PROPAGAÇÃO EM LINKS DA PÁGINA ====================

    function rewriteAllLinks(root) {
        const anchors = (root || document).querySelectorAll('a[href]');
        anchors.forEach(rewriteAnchor);
    }

    function rewriteAnchor(a) {
        const href = a.getAttribute('href');
        if (!href) return;

        // Injeta UTMs em: links internos (mesma origem) E links de checkout configurados
        let shouldInject = false;
        try {
            const url = new URL(href, window.location.origin);
            const isSameOrigin = url.origin === window.location.origin;
            shouldInject = isSameOrigin || isCheckoutHost(href);
        } catch (e) { return; }

        if (!shouldInject) return;

        const newHref = appendParamsToUrl(href);
        if (newHref !== href) {
            a.setAttribute('href', newHref);
            a.dataset.utmInjected = '1';
        }
    }

    // ==================== OBSERVER PRO PLAYER VTURB ====================

    // O vturb (Converteai) injeta o botão CTA dinamicamente (shadow DOM ou direto no DOM).
    // Observamos mudanças e reescrevemos qualquer <a> que apareça apontando para o checkout.
    function setupMutationObserver() {
        const observer = new MutationObserver(mutations => {
            for (const m of mutations) {
                m.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;
                    if (node.tagName === 'A') {
                        rewriteAnchor(node);
                    } else if (node.querySelectorAll) {
                        node.querySelectorAll('a[href]').forEach(rewriteAnchor);
                    }
                });
                // Mudanças em href de links já existentes
                if (m.type === 'attributes' && m.target.tagName === 'A') {
                    if (m.target.dataset.utmInjected !== '1') rewriteAnchor(m.target);
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['href']
        });
    }

    // ==================== FALLBACK: CLICK INTERCEPTOR ====================

    // Caso o player abra via window.open() ou recrie o link entre a reescrita e o clique,
    // intercepta no momento do clique pra garantir UTM.
    function setupClickInterceptor() {
        document.addEventListener('click', function (e) {
            const a = e.target.closest && e.target.closest('a[href]');
            if (!a) return;
            const href = a.getAttribute('href');
            if (!href || !isCheckoutHost(href)) return;

            const newHref = appendParamsToUrl(href);
            if (newHref !== href) {
                a.setAttribute('href', newHref);
            }
        }, true);
    }

    // ==================== INTERCEPTAÇÃO DE window.open ====================

    // Algumas integrações de player usam window.open em vez de <a>.
    const originalOpen = window.open;
    window.open = function (url, target, features) {
        if (typeof url === 'string' && isCheckoutHost(url)) {
            url = appendParamsToUrl(url);
        }
        return originalOpen.call(window, url, target, features);
    };

    // ==================== BOOT ====================

    function boot() {
        rewriteAllLinks();
        setupMutationObserver();
        setupClickInterceptor();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
