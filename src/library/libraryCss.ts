export const LIBRARY_CSS = `
.sgl-root {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding-top: var(--sgl-top-inset, 70px);
    padding-bottom: var(--sgl-bottom-inset, 58px);
    overflow: hidden;
    overflow: clip;
    display: flex;
    flex-direction: column;
    background: #06090e;
    color: #f0f6fc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    user-select: none;
    z-index: 1;
}

.sgl-root * {
    box-sizing: border-box;
}

/* Ambient Blurred Background */
.sgl-bg-container {
    position: absolute;
    inset: -30px;
    pointer-events: none;
    overflow: hidden;
    z-index: 0;
}

.sgl-bg-layer {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center 30%;
    filter: brightness(0.36) saturate(1.18);
    transform: none;
    transition: opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: opacity;
}

.sgl-bg-vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 65% 50%, rgba(6, 9, 14, 0.20) 0%, rgba(6, 9, 14, 0.68) 75%, #06090e 100%);
}

/* Top Header / Categories Ribbon */
.sgl-header {
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 32px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(10, 14, 22, 0.6);
    backdrop-filter: blur(20px);
    z-index: 20;
    flex-shrink: 0;
}

.sgl-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 1.2px;
    color: #ffffff;
}

.sgl-brand-icon {
    color: var(--accent, #58a6ff);
}

.sgl-tabs-container {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    flex: 1;
    justify-content: center;
    max-width: 860px;
    overflow: hidden;
}

.sgl-bumper-badge {
    font-size: 10px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.15);
    letter-spacing: 0.5px;
    flex-shrink: 0;
}

.sgl-tabs {
    display: flex;
    align-items: center;
    gap: 26px;
    position: relative;
    overflow-x: auto;
    scrollbar-width: none;
    scroll-behavior: smooth;
    padding: 2px 8px 4px;
    max-width: 100%;
}

.sgl-tabs::-webkit-scrollbar {
    display: none;
}

.sgl-tab {
    position: relative;
    white-space: nowrap;
    flex-shrink: 0;
    padding: 8px 2px 10px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.14em;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.6);
    transition: color 0.2s ease;
    outline: none;
    text-transform: uppercase;
}

.sgl-tab:hover {
    color: #ffffff;
    background: transparent;
}

.sgl-tab.active {
    color: #ffffff;
    background: transparent;
    border: none;
    box-shadow: none;
}

.sgl-tab.focused,
.sgl-tab:focus-visible {
    color: #ffffff;
    border: none;
    box-shadow: none;
    background: transparent;
}

.sgl-tab-line {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 3px;
    border-radius: 2px;
    background: var(--accent, #58a6ff);
    opacity: 0;
    box-shadow: none;
    transition: opacity 0.25s ease, box-shadow 0.25s ease, background 0.35s ease;
    pointer-events: none;
}

.sgl-tab.active .sgl-tab-line {
    opacity: 0.65;
}

.sgl-tab.focused .sgl-tab-line,
.sgl-tab:focus-visible .sgl-tab-line {
    opacity: 1;
    box-shadow: 0 0 14px 2px var(--accent, #58a6ff);
}

.sgl-tab-count {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    padding: 1px 6px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.65);
    transition: all 0.2s ease;
}

.sgl-tab.active .sgl-tab-count,
.sgl-tab.focused .sgl-tab-count {
    background: rgba(255, 255, 255, 0.18);
    color: #ffffff;
}

/* Sub-collection Breadcrumb in Header */
.sgl-breadcrumb {
    display: flex;
    align-items: center;
    gap: 10px;
}

.sgl-btn-back-col {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 8px;
    font-size: 11.5px;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: #ffffff;
    cursor: pointer;
    transition: all 0.15s ease;
    outline: none;
}

.sgl-btn-back-col:hover,
.sgl-btn-back-col.focused {
    background: rgba(255, 255, 255, 0.16);
    border-color: var(--accent, #58a6ff);
    box-shadow: 0 0 10px var(--accent-glow, rgba(88, 166, 255, 0.35));
}

.sgl-breadcrumb-title {
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.8px;
    color: var(--accent, #58a6ff);
}


.sgl-header-info {
    font-size: 12px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.45);
    letter-spacing: 0.8px;
}

/* Main Split View */
.sgl-body {
    flex: 1;
    display: flex;
    min-height: 0;
    position: relative;
    z-index: 10;
}

/* Left Panel: Inspector */
.sgl-inspector {
    width: 370px;
    flex-shrink: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 22px 28px;
    gap: 13px;
    overflow-y: auto;
    scrollbar-width: none;
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    background: linear-gradient(90deg, rgba(7, 10, 16, 0.54) 0%, rgba(7, 10, 16, 0.32) 100%);
    backdrop-filter: blur(20px);
    box-sizing: border-box;
}

.sgl-inspector::-webkit-scrollbar {
    display: none;
}

.sgl-poster-wrapper {
    width: 100%;
    max-width: 290px;
    aspect-ratio: 2 / 3;
    align-self: center;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 16px 38px rgba(0, 0, 0, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.14);
    position: relative;
    flex-shrink: 0;
    background: #11141c;
}

.sgl-poster-wrapper.sgl-poster-square {
    aspect-ratio: 1 / 1;
    max-width: 260px;
}

.sgl-poster-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: opacity 0.2s ease;
}

.sgl-title-box {
    min-height: 44px;
    display: flex;
    align-items: center;
}

.sgl-title-text {
    font-size: 21px;
    font-weight: 800;
    line-height: 1.25;
    color: #ffffff;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.sgl-meta-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.sgl-source-pill {
    font-size: 11px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
}

.sgl-status-pill {
    font-size: 11px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 12px;
    background: rgba(46, 160, 67, 0.2);
    color: #3fb950;
    border: 1px solid rgba(46, 160, 67, 0.35);
}

/* Stats / Chips Grid */
.sgl-stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}

.sgl-stat-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.sgl-stat-label {
    font-size: 10.5px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.sgl-stat-value {
    font-size: 13.5px;
    font-weight: 700;
    color: #ffffff;
}

.sgl-stat-bar {
    height: 3px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.12);
    margin-top: 4px;
    overflow: hidden;
}

.sgl-stat-fill {
    height: 100%;
    border-radius: 2px;
    background: var(--accent, #58a6ff);
}

/* Description */
.sgl-description {
    font-size: 12px;
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.7);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Action Buttons */
.sgl-actions {
    display: flex;
    gap: 10px;
    margin-top: auto;
    padding-top: 6px;
}

.sgl-btn-details {
    flex: 1;
    padding: 10px 16px;
    border-radius: 999px;
    font-size: 13.5px;
    font-weight: 800;
    background: var(--accent, #58a6ff);
    color: #0b0d10;
    border: 1px solid var(--accent, #58a6ff);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.35s ease;
    outline: none;
}

.sgl-btn-details:hover,
.sgl-btn-details:focus-visible {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9), 0 12px 30px -6px var(--accent, #58a6ff);
}

.sgl-btn-play {
    flex: 1;
    padding: 10px 14px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
    background: rgba(12, 16, 22, 0.45);
    border: 1px solid rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(12px);
    color: #ffffff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
    outline: none;
}

.sgl-btn-play:hover,
.sgl-btn-play:focus-visible {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.35);
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 8px 24px rgba(0, 0, 0, 0.5);
}

.sgl-btn-badge {
    font-size: 10px;
    font-weight: 800;
    padding: 1px 6px;
    border-radius: 6px;
    letter-spacing: 0.5px;
}

.sgl-btn-details .sgl-btn-badge {
    background: rgba(0, 0, 0, 0.22);
    color: #0b0d10;
    border: 1px solid rgba(0, 0, 0, 0.12);
}

.sgl-btn-play .sgl-btn-badge {
    background: rgba(255, 255, 255, 0.14);
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Right Panel: Game Grid */
.sgl-grid-panel {
    flex: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 22px 28px 28px 24px;
    min-width: 0;
    overflow-y: auto;
    scrollbar-width: none;
    scroll-behavior: smooth;
    box-sizing: border-box;
}

.sgl-grid-panel::-webkit-scrollbar {
    display: none;
}

.sgl-grid {
    display: grid;
    grid-template-columns: repeat(var(--sgl-columns, 3), 1fr);
    gap: 14px;
    align-content: start;
    padding-bottom: 24px;
}

/* Horizontal Banner Card */
.sgl-card {
    aspect-ratio: 460 / 215;
    border-radius: 10px;
    overflow: hidden;
    position: relative;
    cursor: pointer;
    background: #11151f;
    border: none;
    box-shadow: 0 6px 20px -8px rgba(0, 0, 0, 0.6);
    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: transform;
    contain: paint;
    outline: none;
}

.sgl-card::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
    transition: box-shadow 0.22s ease;
}

.sgl-card:hover {
    transform: translateY(-2px) scale(1.015);
}

.sgl-card:hover::after {
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);
}

.sgl-card.focused,
.sgl-card:focus-visible {
    transform: translateY(-4px) scale(1.035);
    z-index: 5;
    box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.85), 0 16px 40px -10px var(--accent, #58a6ff);
}

.sgl-card.focused::after,
.sgl-card:focus-visible::after {
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
}

.sgl-card-bar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 3px;
    background: var(--accent, #58a6ff);
    opacity: 0;
    box-shadow: 0 0 8px var(--accent, #58a6ff);
    transition: opacity 0.2s ease, background 0.3s ease;
    pointer-events: none;
    z-index: 3;
}

.sgl-card.focused .sgl-card-bar,
.sgl-card-collection.focused .sgl-card-bar {
    opacity: 1;
}

.sgl-card-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: filter 0.2s ease;
}

.sgl-card-fallback {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 12px;
    background: linear-gradient(180deg, #181d28 0%, #0c1017 100%);
}

.sgl-card-title {
    font-size: 13px;
    font-weight: 700;
    color: #ffffff;
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.sgl-card-running-badge {
    position: absolute;
    top: 7px;
    right: 7px;
    background: rgba(46, 160, 67, 0.85);
    color: #ffffff;
    font-size: 9.5px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 8px;
    letter-spacing: 0.5px;
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    gap: 4px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.sgl-running-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #ffffff;
    animation: sglPulse 1.5s infinite;
}

@keyframes sglPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
}

/* Steam Deck-Style Collection Card with Multi-Cover Fan Collage */
.sgl-card-collection {
    aspect-ratio: 460 / 215;
    border-radius: 12px;
    overflow: hidden;
    position: relative;
    cursor: pointer;
    background: radial-gradient(circle at 50% 25%, rgba(28, 38, 56, 0.85) 0%, rgba(10, 14, 22, 0.95) 100%);
    border: none;
    box-shadow: 0 6px 20px -8px rgba(0, 0, 0, 0.6);
    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: transform;
    outline: none;
    display: flex;
    flex-direction: column;
}

.sgl-card-collection::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
    transition: box-shadow 0.22s ease;
}

.sgl-card-collection:hover {
    transform: translateY(-2px) scale(1.015);
}

.sgl-card-collection:hover::after {
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);
}

.sgl-card-collection.focused,
.sgl-card-collection:focus-visible {
    transform: translateY(-4px) scale(1.035);
    z-index: 5;
    box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.85), 0 16px 40px -10px var(--accent, #58a6ff);
}

.sgl-card-collection.focused::after,
.sgl-card-collection:focus-visible::after {
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
}

.sgl-col-fan-area {
    flex: 1;
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding-top: 6px;
}

.sgl-col-fan-card {
    position: absolute;
    width: 52px;
    height: 78px;
    border-radius: 5px;
    overflow: hidden;
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: #161b22;
    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.sgl-col-fan-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.sgl-col-card-far-left {
    transform: translateX(-52px) translateY(8px) rotate(-14deg) scale(0.82);
    z-index: 1;
}

.sgl-col-card-left {
    transform: translateX(-26px) translateY(3px) rotate(-7deg) scale(0.91);
    z-index: 2;
}

.sgl-col-card-right {
    transform: translateX(26px) translateY(3px) rotate(7deg) scale(0.91);
    z-index: 2;
}

.sgl-col-card-far-right {
    transform: translateX(52px) translateY(8px) rotate(14deg) scale(0.82);
    z-index: 1;
}

.sgl-col-card-center {
    transform: translateX(0) translateY(-2px) rotate(0deg) scale(1);
    z-index: 3;
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.85);
    border-color: rgba(255, 255, 255, 0.3);
}

.sgl-card-collection.focused .sgl-col-card-center {
    transform: translateX(0) translateY(-8px) rotate(0deg) scale(1.06);
}

.sgl-col-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    background: rgba(10, 14, 22, 0.85);
    backdrop-filter: blur(14px);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    z-index: 4;
}

.sgl-col-footer-title {
    font-size: 13px;
    font-weight: 700;
    color: #ffffff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: 0.3px;
}

.sgl-col-footer-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.85);
    white-space: nowrap;
    margin-left: 8px;
    letter-spacing: 0.5px;
}

/* Inspector 5-Card Fan for Collections */
.sgl-inspector-col-fan {
    width: 100%;
    max-width: 310px;
    height: 180px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    margin-bottom: 6px;
}

.sgl-insp-col-card {
    position: absolute;
    width: 78px;
    height: 117px;
    border-radius: 7px;
    overflow: hidden;
    box-shadow: 0 14px 28px rgba(0, 0, 0, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: #11141c;
    transition: transform 0.25s ease;
}

.sgl-insp-col-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.sgl-insp-col-card-far-left {
    transform: translateX(-76px) translateY(12px) rotate(-16deg) scale(0.82);
    z-index: 1;
}

.sgl-insp-col-card-left {
    transform: translateX(-38px) translateY(5px) rotate(-8deg) scale(0.91);
    z-index: 2;
}

.sgl-insp-col-card-right {
    transform: translateX(38px) translateY(5px) rotate(8deg) scale(0.91);
    z-index: 2;
}

.sgl-insp-col-card-far-right {
    transform: translateX(76px) translateY(12px) rotate(16deg) scale(0.82);
    z-index: 1;
}

.sgl-insp-col-card-center {
    transform: translateX(0) translateY(-4px) rotate(0deg) scale(1);
    z-index: 3;
    box-shadow: 0 18px 36px rgba(0, 0, 0, 0.85);
    border-color: rgba(255, 255, 255, 0.3);
}

/* Empty state */
.sgl-empty {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: rgba(255, 255, 255, 0.4);
    font-size: 15px;
    font-weight: 600;
    gap: 8px;
}
`;

