/**
 * INTERCOPIAS COBÁN - CORE SCRIPT
 * Manejo unificado de Navegación, Menú Móvil y Scroll
 */

document.addEventListener('DOMContentLoaded', () => {
    const queryParams = new URLSearchParams(window.location.search);
    const querySource = (queryParams.get('utm_source') || '').trim().toLowerCase();
    let trafficSource = querySource || 'direct';
    let trafficMedium = queryParams.get('utm_medium') || '';
    let trafficCampaign = queryParams.get('utm_campaign') || '';

    try {
        if (querySource) {
            sessionStorage.setItem('inco_utm_source', querySource);
            sessionStorage.setItem('inco_utm_medium', trafficMedium);
            sessionStorage.setItem('inco_utm_campaign', trafficCampaign);
        }
        trafficSource = sessionStorage.getItem('inco_utm_source') || trafficSource;
        trafficMedium = sessionStorage.getItem('inco_utm_medium') || trafficMedium;
        trafficCampaign = sessionStorage.getItem('inco_utm_campaign') || trafficCampaign;
    } catch {}

    const isTikTokVisit = trafficSource === 'tiktok';
    const contactPhone = '(502) 8000 2944';
    const contactPhoneHref = 'tel:+50280002944';

    const trackContactClick = (link, method) => {
        if (link.dataset.incoContactTracked) return;
        link.dataset.incoContactTracked = 'true';
        link.addEventListener('click', () => {
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
