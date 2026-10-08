export const LIBRARY_CSS = `
.sgl-root {
    position: absolute;
    inset: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: #06090e;
    color: #f0f6fc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    user-select: none;
    z-index: 1;
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
    filter: brightness(0.24) saturate(1.15);
    transform: none;
    transition: opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: opacity;
}

.sgl-bg-vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 65% 50%, rgba(6, 9, 14, 0.35) 0%, rgba(6, 9, 14, 0.88) 75%, #06090e 100%);
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
    gap: 8px;
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
}

.sgl-tabs {
    display: flex;
    align-items: center;
    gap: 6px;
}

.sgl-tab {
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 7px;
    border: 1px solid transparent;
    background: transparent;
    color: rgba(255, 255, 255, 0.6);
    transition: all 0.15s ease;
    outline: none;
}

.sgl-tab:hover {
    color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.06);
}

.sgl-tab.active {
    background: rgba(255, 255, 255, 0.14);
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.18);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
}

.sgl-tab.focused,
.sgl-tab:focus-visible {
    border-color: var(--accent, #58a6ff);
    box-shadow: 0 0 0 1px var(--accent, #58a6ff), 0 0 12px var(--accent-glow, rgba(88, 166, 255, 0.45));
}

.sgl-tab-count {
    font-size: 11px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.65);
}

.sgl-tab.active .sgl-tab-count {
    background: rgba(255, 255, 255, 0.2);
    color: #ffffff;
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
    background: linear-gradient(90deg, rgba(7, 10, 16, 0.72) 0%, rgba(7, 10, 16, 0.45) 100%);
    backdrop-filter: blur(24px);
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

.sgl-btn-play {
    flex: 1;
    padding: 10px 16px;
    border-radius: 24px;
    font-size: 13.5px;
    font-weight: 700;
    background: linear-gradient(135deg, var(--accent, #1f6feb) 0%, rgba(31, 111, 235, 0.75) 100%);
    color: #ffffff;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    transition: all 0.15s ease;
    outline: none;
}

.sgl-btn-play:hover,
.sgl-btn-play:focus-visible {
    filter: brightness(1.15);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5), 0 0 14px var(--accent-glow, rgba(88, 166, 255, 0.45));
}

.sgl-btn-details {
    padding: 10px 14px;
    border-radius: 24px;
    font-size: 13px;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: #ffffff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: all 0.15s ease;
    outline: none;
}

.sgl-btn-details:hover,
.sgl-btn-details:focus-visible {
    background: rgba(255, 255, 255, 0.16);
    border-color: rgba(255, 255, 255, 0.25);
    transform: translateY(-1px);
}

.sgl-btn-badge {
    font-size: 10.5px;
    font-weight: 800;
    padding: 1px 5px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.35);
    color: rgba(255, 255, 255, 0.9);
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
    border: 2px solid rgba(255, 255, 255, 0.08);
    transition: transform 0.16s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.16s ease, box-shadow 0.16s ease;
    will-change: transform;
    contain: paint;
    outline: none;
}

.sgl-card:hover {
    border-color: rgba(255, 255, 255, 0.25);
    transform: scale(1.02);
}

.sgl-card.focused,
.sgl-card:focus-visible {
    transform: scale(1.045);
    z-index: 5;
    border-color: var(--accent, #58a6ff);
    box-shadow: 0 0 0 1px var(--accent, #58a6ff), 0 8px 24px rgba(0, 0, 0, 0.7), 0 0 18px var(--accent-glow, rgba(88, 166, 255, 0.45));
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
