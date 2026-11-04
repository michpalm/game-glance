import { Focusable, SliderField } from '@decky/ui';
import { LuArrowUpRight, LuMusic, LuPause, LuPlay, LuRepeat, LuRepeat1, LuShuffle, LuSkipBack, LuSkipForward, LuVolume2 } from 'react-icons/lu';
import type { SoundtrackSnapshot } from '../steam/soundtrack';
import { MenuAction } from './MenuAction';

export interface SoundtrackActions {
    togglePlay(): void; previous(): void; next(): void; toggleShuffle(): void; cycleRepeat(): void;
    setVolume(volume: number): void; seek(ms: number): void; browse(): void;
}

/** A track time as m:ss. */
export function clock(ms: number): string {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Steam's soundtrack player in the menu: the cover at the left, the track and its controls at the right. */
export function SoundtrackPanel({ s, a }: { s: SoundtrackSnapshot; a: SoundtrackActions }) {
    const heading = <div className="gg-menu-heading"><h2>Soundtrack</h2>
        <MenuAction id="soundtrack:browse" onAction={a.browse}><LuArrowUpRight aria-hidden="true" />Browse soundtracks</MenuAction></div>;
    const tile = <span className="gg-soundtrack-cover gg-soundtrack-empty" aria-hidden="true"><LuMusic /></span>;
    if (s.status === 'idle') return <>{heading}
        <div className="gg-soundtrack">{tile}
            <div className="gg-soundtrack-titles"><span className="gg-soundtrack-track">Nothing playing</span><span className="gg-plugin-dim">Pick a soundtrack to start.</span></div>
        </div></>;
    const playing = s.status === 'playing';
    const repeatLabel = s.repeat === 'one' ? 'Repeat one' : 'Repeat';
    return <>{heading}
        <div className="gg-soundtrack">
            {s.cover ? <img className="gg-soundtrack-cover" src={s.cover} alt="" /> : tile}
            <Focusable className="gg-soundtrack-side" flow-children="column">
                <div className="gg-soundtrack-titles"><span className="gg-plugin-dim">{s.album}</span><span className="gg-soundtrack-track">{s.track}</span></div>
                <div className="gg-menu-setting gg-menu-setting-slider" data-gg-focus="soundtrack:position">
                    <SliderField highlightOnFocus={false} label={<span className="gg-menu-slider-label"><span>{clock(s.positionMs)}</span><output>{clock(s.lengthMs)}</output></span>}
                        value={s.positionMs} min={0} max={Math.max(1, s.lengthMs)} step={1000} showValue={false} onChange={a.seek} />
                </div>
                <Focusable className="gg-soundtrack-controls" flow-children="row">
                    <MenuAction id="soundtrack:shuffle" className="gg-soundtrack-button" ariaLabel="Shuffle" selected={s.shuffle} onAction={a.toggleShuffle}><LuShuffle aria-hidden="true" /></MenuAction>
                    <MenuAction id="soundtrack:previous" className="gg-soundtrack-button" ariaLabel="Previous" onAction={a.previous}><LuSkipBack aria-hidden="true" /></MenuAction>
                    <MenuAction id="soundtrack:play" className="gg-soundtrack-button gg-soundtrack-play" ariaLabel={playing ? 'Pause' : 'Play'} onAction={a.togglePlay}>{playing ? <LuPause aria-hidden="true" /> : <LuPlay aria-hidden="true" />}</MenuAction>
                    <MenuAction id="soundtrack:next" className="gg-soundtrack-button" ariaLabel="Next" onAction={a.next}><LuSkipForward aria-hidden="true" /></MenuAction>
                    <MenuAction id="soundtrack:repeat" className="gg-soundtrack-button" ariaLabel={repeatLabel} selected={s.repeat !== 'off'} onAction={a.cycleRepeat}>{s.repeat === 'one' ? <LuRepeat1 aria-hidden="true" /> : <LuRepeat aria-hidden="true" />}</MenuAction>
                </Focusable>
                <div className="gg-menu-setting gg-menu-setting-slider" data-gg-focus="soundtrack:volume">
                    <SliderField highlightOnFocus={false} label={<span className="gg-menu-slider-label"><span className="gg-menu-setting-label"><LuVolume2 aria-hidden="true" /><span>Volume</span></span><output>{`${s.volume}%`}</output></span>}
                        value={s.volume} min={0} max={100} step={1} showValue={false} onChange={a.setVolume} />
                </div>
            </Focusable>
        </div></>;
}
