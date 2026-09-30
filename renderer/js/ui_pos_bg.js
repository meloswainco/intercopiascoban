(function() {
        // ── Estado ──────────────────────────────────────────────
        let _bgImage   = null;   // base64 de la imagen
        let _bgOpacity = 82;     // 0-100 opacidad del overlay
        let _bgBlur    = 0;      // px desenfoque
        let _parallax  = false;
        let _parallaxRAF = null;

        const LS_KEY = 'pos_bg_config_v1';

        // ── Cargar desde localStorage al inicio ──────────────────
        function cargarConfig() {
            try {
                const raw = localStorage.getItem(LS_KEY);
                if (!raw) return;
                const cfg = JSON.parse(raw);
                _bgImage   = cfg.image   ?? null;
                _bgOpacity = cfg.opacity ?? 82;
                _bgBlur    = cfg.blur    ?? 0;
                _parallax  = cfg.parallax ?? false;
                aplicarAlDOM();
            } catch(e) {}
        }

        function guardarConfig() {
            try {
                localStorage.setItem(LS_KEY, JSON.stringify({
                    image: _bgImage, opacity: _bgOpacity, blur: _bgBlur, parallax: _parallax
                }));
            } catch(e) {
                // Si la imagen es muy grande para localStorage, se guarda sin imagen
                try {
                    localStorage.setItem(LS_KEY, JSON.stringify({
                        image: null, opacity: _bgOpacity, blur: _bgBlur, parallax: _parallax
                    }));
                } catch(e2) {}
            }
        }

        // ── Aplicar al DOM real ──────────────────────────────────
        function aplicarAlDOM() {
            const layer   = document.getElementById('pos-bg-layer');
            const overlay = document.getElementById('pos-bg-overlay');
            if (!layer || !overlay) return;

            if (_bgImage) {
                layer.style.backgroundImage  = `url("${_bgImage}")`;
                layer.style.backgroundSize   = 'cover';
                layer.style.backgroundPosition = 'center';
                layer.style.filter           = `blur(${_bgBlur}px)`;
                // Expandir para evitar bordes blancos con blur
                if (_bgBlur > 0) {
                    layer.style.margin = `-${_bgBlur * 2}px`;
                    layer.style.width  = `calc(100% + ${_bgBlur * 4}px)`;
                    layer.style.height = `calc(100% + ${_bgBlur * 4}px)`;
                    layer.style.top    = `-${_bgBlur * 2}px`;
                    layer.style.left   = `-${_bgBlur * 2}px`;
                } else {
                    layer.style.margin = '';
                    layer.style.width  = '';
                    layer.style.height = '';
                    layer.style.top    = '0';
                    layer.style.left   = '0';
                }
            } else {
                layer.style.backgroundImage = '';
            }

            const alpha = _bgImage ? (_bgOpacity / 100).toFixed(2) : '1';
            overlay.style.background = `rgba(241,245,249,${alpha})`;

            // Parallax
            if (_parallax && _bgImage) {
                activarParallax();
            } else {
                desactivarParallax();
            }
        }

        // ── Parallax ─────────────────────────────────────────────
        let _mx = 0.5, _my = 0.5;
        let _cx = 0.5, _cy = 0.5;

        function activarParallax() {
            const section = document.getElementById('content-ventas');
            if (!section) return;
            section.addEventListener('mousemove', onMouseMove, { passive: true });
            animarParallax();
        }

        function desactivarParallax() {
            const section = document.getElementById('content-ventas');
            if (section) section.removeEventListener('mousemove', onMouseMove);
            if (_parallaxRAF) { cancelAnimationFrame(_parallaxRAF); _parallaxRAF = null; }
            const layer = document.getElementById('pos-bg-layer');
            if (layer) layer.style.backgroundPosition = 'center center';
        }

        function onMouseMove(e) {
            const rect = e.currentTarget.getBoundingClientRect();
            _mx = (e.clientX - rect.left) / rect.width;
            _my = (e.clientY - rect.top)  / rect.height;
        }

        function animarParallax() {
            _cx += (_mx - _cx) * 0.06;
            _cy += (_my - _cy) * 0.06;
            const ox = (_cx - 0.5) * -18;  // ±9px desplazamiento
            const oy = (_cy - 0.5) * -18;
            const layer = document.getElementById('pos-bg-layer');
            if (layer) layer.style.backgroundPosition = `calc(50% + ${ox}px) calc(50% + ${oy}px)`;
            _parallaxRAF = requestAnimationFrame(animarParallax);
        }

        // ── Actualizar preview en tiempo real ─────────────────────
        function actualizarPreview() {
            const prevImg     = document.getElementById('pos-bg-preview-img');
            const prevOverlay = document.getElementById('pos-bg-preview-overlay');
            const placeholder = document.getElementById('pos-bg-preview-placeholder');
            if (!prevImg) return;

            if (_bgImage) {
                prevImg.style.backgroundImage  = `url("${_bgImage}")`;
                prevImg.style.filter           = `blur(${Math.min(_bgBlur, 4)}px)`;
                placeholder.style.display = 'none';
            } else {
                prevImg.style.backgroundImage = '';
                placeholder.style.display = '';
            }
            const alpha = _bgImage ? (_bgOpacity / 100).toFixed(2) : '1';
            prevOverlay.style.background = `rgba(241,245,249,${alpha})`;
        }

        // ── API pública ──────────────────────────────────────────
        window.abrirModalFondoPOS = function() {
            const modal = document.getElementById('modal-fondo-pos');
            modal.style.display = 'flex';

            // Sincronizar sliders con estado actual
            const sliderOp   = document.getElementById('pos-overlay-slider');
            const sliderBlur = document.getElementById('pos-blur-slider');
            const parallaxCb = document.getElementById('pos-parallax-toggle');
            if (sliderOp)   { sliderOp.value   = _bgOpacity; document.getElementById('pos-overlay-val').textContent = _bgOpacity + '%'; }
            if (sliderBlur) { sliderBlur.value  = _bgBlur;   document.getElementById('pos-blur-val').textContent    = _bgBlur    + 'px'; }
            if (parallaxCb) {
                parallaxCb.checked = _parallax;
                sincronizarToggleUI(_parallax);
            }
            actualizarPreview();
        };

        window.cerrarModalFondoPOS = function() {
            document.getElementById('modal-fondo-pos').style.display = 'none';
        };

        window.posBgHandleUpload = function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(ev) {
                _bgImage = ev.target.result;
                actualizarPreview();
            };
            reader.readAsDataURL(file);
            // Reset input para permitir re-selección del mismo archivo
            e.target.value = '';
        };

        window.posBgUpdateOverlay = function(val) {
            _bgOpacity = parseInt(val);
            document.getElementById('pos-overlay-val').textContent = val + '%';
            actualizarPreview();
        };

        window.posBgUpdateBlur = function(val) {
            _bgBlur = parseInt(val);
            document.getElementById('pos-blur-val').textContent = val + 'px';
            actualizarPreview();
        };

        function sincronizarToggleUI(activo) {
            const knob = document.getElementById('pos-parallax-knob');
            const dot  = document.getElementById('pos-parallax-dot');
            if (knob) knob.style.background = activo ? '#f59e0b' : '#cbd5e1';
            if (dot)  dot.style.left        = activo ? '23px'   : '3px';
        }

        window.posBgToggleParallax = function(activo) {
            _parallax = activo;
            sincronizarToggleUI(activo);
        };

        window.posBgAplicar = function() {
            aplicarAlDOM();
            guardarConfig();
            cerrarModalFondoPOS();
        };

        window.posBgEliminar = function() {
            _bgImage = null;
            const layer = document.getElementById('pos-bg-layer');
            if (layer) layer.style.backgroundImage = '';
            const overlay = document.getElementById('pos-bg-overlay');
            if (overlay) overlay.style.background = 'rgba(241,245,249,1)';
            desactivarParallax();
            guardarConfig();
            actualizarPreview();
        };

        // ── Inicializar al cargar ────────────────────────────────
        if (document.readyState === 'loading') {
            document.addEventListener('modalsReady', cargarConfig);
        } else {
            cargarConfig();
        }
    })();