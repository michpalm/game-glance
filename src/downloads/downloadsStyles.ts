import { IDLE_TILE, focusRing, tokenCss, unit as u } from '../styles/tokens';

/** Steam's DialogButton rules are long class chains: these match Storage's weight so ours win. */
const ROW = '.gg-dl .gg-dl-list button.gg-dl-row.DialogButton', DONE = '.gg-dl .gg-dl-list button.gg-dl-done.DialogButton', CARD = '.gg-dl .gg-dl-side button.gg-dl-card.DialogButton';
const FOCUS = ':is(.gpfocus,:focus-visible,:focus)';

/**
 * The Downloads page (mock-up A2 with Completed): Storage's look. Units are the mock-up's 1920-wide pixels (`--gg-d`).
 */
export const downloadsStyles = tokenCss('.gg-dl') + `
.gg-dl{--gg-d:calc(100vw / 1920);position:absolute;inset:0;overflow:hidden;background:var(--gg-scrim);color:var(--gg-text);font-family:"Motiva Sans",Arial,sans-serif;text-shadow:var(--gg-text-shadow)}
.gg-dl-hero{position:absolute;inset:${u(-80)};background-size:cover;background-position:center;filter:var(--gg-art-fill-dim);opacity:.55}
.gg-dl-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,7,10,.35),rgba(5,7,10,.75))}
.gg-dl-page{position:relative;height:100%;box-sizing:border-box;padding:${u(66)} ${u(96)} ${u(96)};display:flex;flex-direction:column}
.gg-dl-title{margin:0 0 ${u(34)};font-size:${u(46)};font-weight:var(--gg-weight-heading);line-height:1.2}
.gg-dl-columns{flex:1;min-height:0;display:flex;gap:${u(40)}}
.gg-dl-side{width:${u(520)};flex:none;display:flex;flex-direction:column;gap:${u(24)}}
.gg-dl-games{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column}
.gg-dl-list{flex:1;min-width:0;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:${u(10)};padding:6px;margin:-6px;scroll-padding-block:6px}
.gg-dl-eyebrow{margin:${u(-4)} 0 ${u(14)} ${u(6)};font-size:${u(16)};font-weight:var(--gg-weight-heading);letter-spacing:.06em;text-transform:uppercase;color:var(--gg-text-dim)}
.gg-dl-eyebrow-done{margin-top:${u(18)}}
${CARD},.gg-dl-network,${ROW},${DONE}{display:flex;box-sizing:border-box;width:100%;min-width:0;margin:0;text-align:left;cursor:default;font:inherit;text-transform:none;color:var(--gg-text);text-shadow:var(--gg-text-shadow);border:${u(1.5)} solid var(--gg-menu-detail-edge,rgba(182,199,224,.40));background:var(--gg-glass);box-shadow:none;transition:background var(--gg-base),border-color var(--gg-fast),outline-color var(--gg-fast)}
${CARD}:not(${FOCUS}),.gg-dl-network,${ROW}:not(${FOCUS}),${DONE}:not(${FOCUS}){border-color:${IDLE_TILE.edge};background-image:linear-gradient(${IDLE_TILE.tint},${IDLE_TILE.tint})}
${CARD},.gg-dl-network{flex-direction:column;align-items:stretch;padding:${u(16)} ${u(28)} ${u(26)};border-radius:${u(22)};backdrop-filter:blur(var(--gg-glass-blur))}
.gg-dl-card-hero{position:relative;display:block;height:${u(150)};margin:${u(-16)} ${u(-28)} ${u(6)};border-radius:${u(20.5)} ${u(20.5)} 0 0;overflow:hidden}
.gg-dl-card-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;-webkit-mask-image:linear-gradient(#000 35%,transparent);mask-image:linear-gradient(#000 35%,transparent)}
.gg-dl-card-logo{position:absolute;left:${u(28)};bottom:${u(6)};max-width:${u(250)};max-height:${u(88)};object-fit:contain;object-position:left bottom;filter:drop-shadow(0 ${u(2)} ${u(6)} rgba(0,0,0,.7))}
.gg-dl-card-hero .gg-dl-card-name{position:absolute;left:${u(28)};right:${u(28)};bottom:${u(8)}}
.gg-dl-card-name{font-size:${u(26)};font-weight:var(--gg-weight-heading);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gg-dl-big{display:flex;align-items:baseline;gap:${u(12)};margin-top:${u(10)}}
.gg-dl-big strong{font-size:${u(96)};font-weight:var(--gg-weight-heading);line-height:1}
.gg-dl-big span{font-size:${u(24)};font-weight:var(--gg-weight-heading);color:var(--gg-text-dim)}
.gg-dl-line{margin-top:${u(14)};font-size:${u(22)};color:var(--gg-text-dim)}
.gg-dl-bars{display:grid;grid-template-columns:${u(126)} 1fr;align-items:center;row-gap:${u(18)};margin-top:${u(20)}}
.gg-dl-bars span{font-size:${u(14)};font-weight:var(--gg-weight-heading);letter-spacing:.04em;color:var(--gg-text-dim)}
.gg-dl-bar{height:${u(6)};border-radius:var(--gg-r-pill);background:var(--gg-track);overflow:hidden}
.gg-dl-bar-fill{display:block;height:100%;border-radius:inherit;background:#4da3ff;transition:width var(--gg-base) linear}
.gg-dl-bar-install .gg-dl-bar-fill{background:var(--gg-ok,#5fd1ae)}
.gg-dl-network h3{margin:${u(8)} 0 0;font-size:${u(24)};font-weight:var(--gg-weight-heading)}
.gg-dl-net-figures{display:flex;align-items:flex-start;gap:${u(60)}}
.gg-dl-net-figures .gg-dl-big strong{font-size:${u(60)}}
.gg-dl-net-figures .gg-dl-big span{font-size:${u(22)}}
.gg-dl-net-side{display:flex;flex-direction:column;gap:${u(6)};margin-top:${u(12)};font-size:${u(19)};color:var(--gg-text-dim)}
.gg-dl-graph{display:block;width:100%;height:${u(122)};margin-top:${u(14)};overflow:visible}
.gg-dl-graph-area{fill:rgba(77,163,255,.24)}
.gg-dl-graph-disk{fill:none;stroke:var(--gg-ok,#5fd1ae);stroke-width:${u(2)};stroke-linejoin:round;vector-effect:non-scaling-stroke}
.gg-dl-graph-peak{stroke:rgba(235,238,245,.85);stroke-width:${u(2)};stroke-dasharray:${u(8)} ${u(6)};vector-effect:non-scaling-stroke}
.gg-dl-key{display:inline-block;width:${u(20)};margin-right:${u(8)};vertical-align:middle;border-top:${u(2)} dashed rgba(235,238,245,.85)}
.gg-dl-key-disk{border-top:${u(3)} solid var(--gg-ok,#5fd1ae)}
.gg-dl-graph-line{fill:none;stroke:#4da3ff;stroke-width:${u(3)};stroke-linejoin:round;vector-effect:non-scaling-stroke}
${ROW},${DONE}{flex:none;align-items:center;padding:${u(12)} ${u(30)} ${u(12)} ${u(14)};gap:${u(22)};border-radius:${u(18)}}
${ROW}{min-height:${u(96)}}
${DONE}{min-height:${u(72)};padding-top:${u(9)};padding-bottom:${u(9)}}
.gg-dl-art{width:${u(152)};height:${u(72)};flex:none;border-radius:${u(10)};object-fit:cover;background:rgba(255,255,255,.08)}
${DONE} .gg-dl-art{width:${u(110)};height:${u(52)}}
.gg-dl-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:${u(2)}}
.gg-dl-name{font-size:${u(30)};font-weight:var(--gg-weight-heading);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
${DONE} .gg-dl-name{font-size:${u(24)};color:var(--gg-text-dim)}
.gg-dl-sub{font-size:${u(22)};color:var(--gg-text-dim)}
${DONE} .gg-dl-sub{font-size:${u(18)}}
.gg-dl-row-bar{margin-top:${u(8)}}
.gg-dl-row-bar .gg-dl-bar-fill{background:rgba(220,226,236,.9)}
.gg-dl-end{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:${u(6)}}
.gg-dl-percent{font-size:${u(30)};font-weight:var(--gg-weight-heading)}
.gg-dl-tag{font-size:${u(15)};font-weight:var(--gg-weight-heading);letter-spacing:.06em;color:var(--gg-ok,#5fd1ae)}
.gg-dl-tag-paused{color:var(--gg-text-dim)}
.gg-dl-done-mark{flex:none;font-size:${u(18)};font-weight:var(--gg-weight-heading);color:var(--gg-ok,#5fd1ae)}
.gg-dl-empty{margin:${u(12)} ${u(6)};font-size:${u(20)};color:var(--gg-text-dim)}
${ROW}${FOCUS},${DONE}${FOCUS},${CARD}${FOCUS}{${focusRing('menu')};background:var(--gg-glass-strong);color:var(--gg-text)}
`;
