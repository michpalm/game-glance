import { IDLE_TILE, focusRing, tokenCss, unit as u } from '../styles/tokens';

/** Steam's own DialogButton rules are long chains of classes: these match the menu's weight so ours win. */
const ROW = '.gg-storage .gg-storage-list button.gg-storage-row.DialogButton', CARD = '.gg-storage .gg-storage-drives button.gg-storage-card.DialogButton';
const FOCUS = ':is(.gpfocus,:focus-visible,:focus)';

/**
 * The Storage page (round-4 mock-up C): drive cards in a 520-unit column at left, the picked drive's games to their
 * right. Units are the mock-up's 1920-wide pixels (`--gg-d`), so the page keeps its proportions at any Steam scale.
 */
export const storageStyles = tokenCss('.gg-storage') + `
.gg-storage{--gg-d:calc(100vw / 1920);position:absolute;inset:0;overflow:hidden;background:var(--gg-scrim);color:var(--gg-text);font-family:"Motiva Sans",Arial,sans-serif;text-shadow:var(--gg-text-shadow)}
.gg-storage-hero{position:absolute;inset:${u(-80)};background-size:cover;background-position:center;filter:var(--gg-art-fill-dim);opacity:.55}
.gg-storage-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,7,10,.35),rgba(5,7,10,.75))}
.gg-storage-page{position:relative;height:100%;box-sizing:border-box;padding:${u(72)} ${u(96)} ${u(96)};display:flex;flex-direction:column}
.gg-storage-title{margin:0 0 ${u(34)};font-size:${u(40)};font-weight:var(--gg-weight-heading);line-height:1.2}
.gg-storage-columns{flex:1;min-height:0;display:flex;gap:${u(44)}}
.gg-storage-drives{width:${u(520)};flex:none;display:flex;flex-direction:column;gap:${u(18)}}
.gg-storage-list{flex:1;min-width:0;overflow-y:auto;display:flex;flex-direction:column;gap:${u(10)};padding:6px;margin:-6px}
${ROW},${CARD}{display:flex;box-sizing:border-box;width:100%;min-width:0;margin:0;text-align:left;cursor:default;font:inherit;text-transform:none;color:var(--gg-text);text-shadow:var(--gg-text-shadow);border:${u(1.5)} solid var(--gg-menu-detail-edge,rgba(182,199,224,.40));background:var(--gg-glass);box-shadow:none;transition:background var(--gg-base),box-shadow var(--gg-base),border-color var(--gg-fast),outline-color var(--gg-fast)}
${ROW}:not(${FOCUS}),${CARD}:not(${FOCUS}):not([aria-current="true"]){border-color:${IDLE_TILE.edge};background-image:linear-gradient(${IDLE_TILE.tint},${IDLE_TILE.tint})}
${CARD}{flex-direction:column;align-items:stretch;gap:${u(6)};padding:${u(28)} ${u(28)} ${u(26)};border-radius:${u(22)};backdrop-filter:blur(var(--gg-glass-blur))}
${CARD}[aria-current="true"]:not(${FOCUS}){border-color:rgba(182,199,224,.49);background:var(--gg-glass-strong)}
.gg-storage-card-name{display:flex;align-items:center;gap:${u(12)};font-size:${u(26)};font-weight:var(--gg-weight-body)}
.gg-storage-card-name svg{width:${u(26)};height:${u(26)};opacity:.85}
.gg-storage-free{display:flex;align-items:baseline;gap:${u(12)};margin-top:${u(10)}}
.gg-storage-free strong{font-size:${u(54)};font-weight:var(--gg-weight-heading);line-height:1}
.gg-storage-free span{font-size:${u(22)};font-weight:var(--gg-weight-body);color:var(--gg-text-dim)}
.gg-storage-card-line,.gg-storage-card-moving{font-size:${u(21)};color:var(--gg-text-idle)}
.gg-storage-card-moving{color:var(--gg-accent-text)}
.gg-storage-bar{margin-top:${u(14)};height:${u(6)};border-radius:var(--gg-r-pill);background:var(--gg-track);overflow:hidden}
.gg-storage-bar>span{display:block;height:100%;border-radius:inherit;background:var(--gg-accent)}
.gg-storage-eyebrow{margin:${u(-4)} 0 ${u(6)} ${u(6)};font-size:${u(15)};font-weight:var(--gg-weight-body);letter-spacing:.18em;text-transform:uppercase;color:var(--gg-text-dim)}
${ROW}{flex:none;align-items:center;min-height:${u(108)};padding:${u(14)} ${u(28)} ${u(14)} ${u(14)};gap:${u(24)};border-radius:${u(22)}}
.gg-storage-art{width:${u(168)};height:${u(79)};flex:none;border-radius:${u(12)};object-fit:cover;background:rgba(255,255,255,.08)}
.gg-storage-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:${u(2)}}
.gg-storage-name{font-size:${u(30)};font-weight:var(--gg-weight-body);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gg-storage-status{font-size:${u(21)};color:var(--gg-text-dim)}
.gg-storage-progress{height:${u(6)};margin-top:${u(8)};border-radius:var(--gg-r-pill);background:var(--gg-track);overflow:hidden}
.gg-storage-progress-fill{display:block;height:100%;background:var(--gg-accent);transition:width var(--gg-base) linear}
.gg-storage-size{flex:none;font-size:${u(28)};font-weight:var(--gg-weight-body)}
${ROW}${FOCUS},${CARD}${FOCUS}{${focusRing('menu')};background:var(--gg-glass-strong);color:var(--gg-text)}
.gg-storage-empty,.gg-storage-unavailable{margin:${u(12)} ${u(6)};font-size:${u(20)};color:var(--gg-text-dim)}
.gg-storage-note{position:absolute;left:50%;bottom:${u(110)};transform:translateX(-50%);padding:${u(14)} ${u(24)};border-radius:var(--gg-r-card);background:var(--gg-glass-solid);border:1px solid var(--gg-edge);font-size:${u(19)};font-weight:var(--gg-weight-body)}
`;
