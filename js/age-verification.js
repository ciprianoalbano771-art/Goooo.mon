/**
 * Google Rewards - Age Verification Script
 *
 * Este script gerencia a verificação de idade antes de acessar o site principal.
 * Ambas as opções redirecionam para o conteúdo principal (camada de proteção visual).
 */

// ==================== SELETORES DOM ====================

const confirmAgeButton = document.getElementById('confirmAgeButton');
const declineAgeButton = document.getElementById('declineAgeButton');
const currentYearElement = document.getElementById('currentYear');

// ==================== INICIALIZAÇÃO ====================

/**
 * Inicializa a aplicação quando o DOM estiver carregado
 */
document.addEventListener('DOMContentLoaded', () => {
    // Configurar ano atual no rodapé
    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }

    // Adicionar event listeners
    if (confirmAgeButton) {
        confirmAgeButton.addEventListener('click', proceedToSite);
    }

    if (declineAgeButton) {
        declineAgeButton.addEventListener('click', proceedToSite);
    }
});

// ==================== FUNÇÕES DE NAVEGAÇÃO ====================

/**
 * Redireciona para o site principal com animação suave
 */
function proceedToSite() {
    // Marcar que passou pela verificação nesta sessão
    sessionStorage.setItem('ageVerificationPassed', 'true');

    // Adicionar animação de saída
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.3s ease-out';

    // Redirecionar para a página principal preservando UTMs e demais query params
    setTimeout(() => {
        window.location.href = '/index.html' + window.location.search + window.location.hash;
    }, 300);
}
