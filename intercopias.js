/**
 * INTERCOPIAS COBÁN - CORE SCRIPT
 * Manejo unificado de Navegación, Menú Móvil y Scroll
 */

document.addEventListener('DOMContentLoaded', () => {
    const consentStorageKey = 'inco_privacy_consent_v1';
    const consentVersion = 1;
    const readPrivacyConsent = () => {
        try {
            const consent = JSON.parse(localStorage.getItem(consentStorageKey) || 'null');
            return consent?.version === consentVersion ? consent : null;
        } catch {
            return null;
        }
    };

    let privacyConsent = readPrivacyConsent();
    const queryParams = new URLSearchParams(window.location.search);
    const querySource = (queryParams.get('utm_source') || '').trim().toLowerCase();
    let trafficSource = querySource || 'direct';
    let trafficMedium = privacyConsent?.analytics ? queryParams.get('utm_medium') || '' : '';
    let trafficCampaign = privacyConsent?.analytics ? queryParams.get('utm_campaign') || '' : '';

    try {
        if (querySource === 'tiktok') sessionStorage.setItem('inco_tiktok_variant', '1');
        trafficSource = querySource || (sessionStorage.getItem('inco_tiktok_variant') === '1' ? 'tiktok' : 'direct');

        if (privacyConsent?.analytics) {
            trafficSource = querySource || sessionStorage.getItem('inco_utm_source') || trafficSource;
            trafficMedium = trafficMedium || sessionStorage.getItem('inco_utm_medium') || '';
            trafficCampaign = trafficCampaign || sessionStorage.getItem('inco_utm_campaign') || '';
        }
    } catch {}

    let analyticsLoaded = false;
    let tiktokEmbedLoaded = false;

    const loadAnalytics = () => {
        if (analyticsLoaded || !privacyConsent?.analytics) return;
        analyticsLoaded = true;
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-MKTSQDQZ';
        document.head.append(script);
    };

    const loadTikTokEmbed = () => {
        const embeds = [...document.querySelectorAll('[data-tiktok-embed]')];
        if (!embeds.length) return;
        embeds.forEach(embed => {
            embed.hidden = false;
            const placeholder = embed.parentElement.querySelector('[data-tiktok-placeholder]');
            if (placeholder) placeholder.hidden = true;
        });
        if (tiktokEmbedLoaded) return;
        tiktokEmbedLoaded = true;
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.tiktok.com/embed.js';
        document.body.append(script);
    };

    const savePrivacyConsent = (analytics, externalMedia) => {
        const previousConsent = privacyConsent;
        privacyConsent = {
            version: consentVersion,
            necessary: true,
            analytics: Boolean(analytics),
            externalMedia: Boolean(externalMedia),
            savedAt: new Date().toISOString()
        };
        try {
            localStorage.setItem(consentStorageKey, JSON.stringify(privacyConsent));
            if (privacyConsent.analytics) {
                if (querySource) {
                    sessionStorage.setItem('inco_utm_source', querySource);
                    sessionStorage.setItem('inco_utm_medium', queryParams.get('utm_medium') || '');
                    sessionStorage.setItem('inco_utm_campaign', queryParams.get('utm_campaign') || '');
                }
                trafficMedium = queryParams.get('utm_medium') || sessionStorage.getItem('inco_utm_medium') || '';
                trafficCampaign = queryParams.get('utm_campaign') || sessionStorage.getItem('inco_utm_campaign') || '';
            }
        } catch {}

        if (privacyConsent.analytics) loadAnalytics();
        if (privacyConsent.externalMedia) loadTikTokEmbed();
        document.getElementById('inco-consent-banner')?.remove();

        if (previousConsent && ((previousConsent.analytics && !privacyConsent.analytics) || (previousConsent.externalMedia && !privacyConsent.externalMedia))) {
            window.location.reload();
        }
    };

    const addPrivacyLinks = () => {
        document.querySelectorAll('.inco-footer').forEach(footer => {
            if (footer.querySelector('.inco-privacy-links')) return;
            const links = document.createElement('div');
            links.className = 'inco-privacy-links';

            const policyLink = document.createElement('a');
            policyLink.href = 'privacidad.html';
            policyLink.textContent = 'Privacidad y cookies';

            const preferencesButton = document.createElement('button');
            preferencesButton.type = 'button';
            preferencesButton.textContent = 'Preferencias de privacidad';
            preferencesButton.addEventListener('click', showPrivacyBanner);

            links.append(policyLink, preferencesButton);
            footer.querySelector(':scope > div')?.append(links);
        });
    };

    function showPrivacyBanner() {
        if (document.getElementById('inco-consent-banner')) return;
        const banner = document.createElement('section');
        banner.id = 'inco-consent-banner';
        banner.className = 'inco-consent-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-labelledby', 'inco-consent-title');
        banner.setAttribute('aria-describedby', 'inco-consent-description');
        banner.innerHTML = `
            <div class="inco-consent-copy">
                <h2 id="inco-consent-title">Tu privacidad importa</h2>
                <p id="inco-consent-description">Guardamos tu elección y, si llegas desde TikTok, la procedencia durante esta sesión para mostrar el teléfono como contacto. Con tu permiso cargamos medición y contenido externo. <a href="privacidad.html">Lee la política.</a></p>
                <div class="inco-consent-options" data-consent-options hidden>
                    <label><input type="checkbox" data-consent-analytics> Medición de visitas e interacciones</label>
                    <label><input type="checkbox" data-consent-external> Videos y contenido externo de TikTok</label>
                </div>
            </div>
            <div class="inco-consent-actions">
                <button type="button" data-consent-accept>Aceptar opcionales</button>
                <button type="button" data-consent-reject>Solo necesarias</button>
                <button type="button" data-consent-configure>Configurar</button>
                <button type="button" data-consent-save hidden>Guardar preferencias</button>
            </div>`;
        document.body.append(banner);

        banner.querySelector('[data-consent-accept]').addEventListener('click', () => savePrivacyConsent(true, true));
        banner.querySelector('[data-consent-reject]').addEventListener('click', () => savePrivacyConsent(false, false));
        banner.querySelector('[data-consent-configure]').addEventListener('click', event => {
            banner.querySelector('[data-consent-options]').hidden = false;
            banner.querySelector('[data-consent-analytics]').checked = Boolean(privacyConsent?.analytics);
            banner.querySelector('[data-consent-external]').checked = Boolean(privacyConsent?.externalMedia);
            event.currentTarget.hidden = true;
            banner.querySelector('[data-consent-save]').hidden = false;
        });
        banner.querySelector('[data-consent-save]').addEventListener('click', () => savePrivacyConsent(
            banner.querySelector('[data-consent-analytics]').checked,
            banner.querySelector('[data-consent-external]').checked
        ));
    }

    if (privacyConsent?.analytics) loadAnalytics();
    if (privacyConsent?.externalMedia) loadTikTokEmbed();
    else {
        document.querySelectorAll('[data-load-tiktok]').forEach(button => {
            button.addEventListener('click', () => savePrivacyConsent(privacyConsent?.analytics, true));
        });
    }
    addPrivacyLinks();
    document.querySelectorAll('.inco-open-privacy-settings').forEach(button => {
        button.addEventListener('click', showPrivacyBanner);
    });
    if (!privacyConsent) showPrivacyBanner();

    const isTikTokVisit = trafficSource === 'tiktok';
    const contactPhone = '(502) 8000 2944';
    const contactPhoneHref = 'tel:+50280002944';

    const trackContactClick = (link, method) => {
        if (link.dataset.incoContactTracked) return;
        link.dataset.incoContactTracked = 'true';
        link.addEventListener('click', () => {
            if (!readPrivacyConsent()?.analytics) return;
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                event: 'contact_cta_click',
                contact_method: method,
                utm_source: trafficSource,
                utm_medium: trafficMedium,
                utm_campaign: trafficCampaign,
                page_path: window.location.pathname,
                cta_label: (link.getAttribute('aria-label') || link.textContent).trim().replace(/\s+/g, ' ').slice(0, 120)
            });
        });
    };

    const createPhoneCaption = () => {
        const caption = document.createElement('small');
        caption.className = 'inco-whatsapp-phone-note';
        caption.append('¿Prefieres llamar? ');

        const phoneLink = document.createElement('a');
        phoneLink.href = contactPhoneHref;
        phoneLink.textContent = contactPhone;
        phoneLink.setAttribute('aria-label', `Llamar al ${contactPhone}`);
        trackContactClick(phoneLink, 'phone');
        caption.append(phoneLink);
        return caption;
    };

    document.querySelectorAll('a[href*="wa.me"], a[href*="api.whatsapp.com"], a[href*="whatsapp.com/send"]').forEach(link => {
        const linkText = link.textContent.trim().replace(/\s+/g, ' ');
        const isPhoneNumberLink = /^\(?\+?502\)?[\s-]*8000[\s-]*2944$/.test(linkText) || /^8000[\s-]*2944$/.test(linkText);

        if (isTikTokVisit) {
            link.href = contactPhoneHref;
            link.removeAttribute('target');
            link.removeAttribute('rel');
            if (link.classList.contains('hidden') && [...link.classList].some(className => className.startsWith('sm:'))) {
                link.classList.add('inco-tiktok-sm-only');
            }
            link.classList.add('inco-tiktok-contact-cta');
            link.setAttribute('aria-label', `Llama o escribe al ${contactPhone}`);

            const callToAction = document.createElement('span');
            callToAction.className = 'inco-tiktok-contact-label';
            callToAction.textContent = 'Llama o escribe a:';

            const phoneNumber = document.createElement('span');
            phoneNumber.className = 'inco-tiktok-contact-number';
            phoneNumber.textContent = contactPhone;

            link.replaceChildren(callToAction, phoneNumber);
            trackContactClick(link, 'phone');
            return;
        }

        if (isPhoneNumberLink) {
            link.href = contactPhoneHref;
            link.removeAttribute('target');
            link.removeAttribute('rel');
            link.setAttribute('aria-label', `Llamar al ${contactPhone}`);
            trackContactClick(link, 'phone');
            return;
        }

        if (link.classList.contains('inco-floating-wa')) {
            link.append(createPhoneCaption());
            link.classList.add('inco-whatsapp-floating-contact');
            trackContactClick(link, 'whatsapp');
            return;
        }

        const wrapper = document.createElement('span');
        wrapper.className = 'inco-whatsapp-contact';
        wrapper.style.flex = window.getComputedStyle(link).flex;

        if (link.classList.contains('w-full')) {
            wrapper.classList.add('inco-whatsapp-contact-full');
            link.classList.add('inco-whatsapp-contact-link-full');
        }
        if (link.classList.contains('flex-1')) {
            wrapper.classList.add('inco-whatsapp-contact-grow');
            link.classList.add('inco-whatsapp-contact-link-full');
        }
        if (link.classList.contains('hidden') && [...link.classList].some(className => className.startsWith('sm:'))) {
            wrapper.classList.add('inco-whatsapp-contact-sm-only');
        }

        const parent = link.parentNode;
        parent.insertBefore(wrapper, link);
        wrapper.append(link, createPhoneCaption());
        trackContactClick(link, 'whatsapp');
    });

    // 1. Manejo del Menú Móvil
    const mobileBtn = document.getElementById('inco-mobile-toggle');
    const mobileMenu = document.getElementById('inco-mobile-menu');
    
    if (mobileBtn && mobileMenu) {
        mobileBtn.addEventListener('click', () => {
            const isExpanded = mobileBtn.getAttribute('aria-expanded') === 'true';
            mobileBtn.setAttribute('aria-expanded', !isExpanded);
            mobileMenu.classList.toggle('hidden');
        });

        // Cerrar al hacer clic en cualquier enlace del menú móvil
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
                mobileBtn.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // 2. Detección automática del enlace activo en la navegación
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.inco-nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href && (href === currentPath || (currentPath === '' && href === 'index.html'))) {
            link.classList.add('active');
        }
    });

    // 3. Elevación visual de la Navbar al hacer Scroll
    const navbar = document.querySelector('.inco-navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 15) {
                navbar.classList.add('shadow-md');
                navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.98)';
            } else {
                navbar.classList.remove('shadow-md');
                navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
            }
        }, { passive: true });
    }

    // 4. Desplazamiento suave con compensación de altura del navbar fijo (68px)
    document.querySelectorAll('a[href^="#"], a[href*="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            const targetParts = href.split('#');
            const targetId = targetParts[1];
            const targetPage = targetParts[0];

            // Si es un anclaje en la página actual
            if (targetId && (targetPage === '' || targetPage === currentPath || (currentPath === 'index.html' && targetPage === 'index.html'))) {
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    e.preventDefault();
                    const navbar = document.querySelector('.inco-navbar');
                    const headerOffset = navbar ? navbar.getBoundingClientRect().height + 8 : 72;
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
});
