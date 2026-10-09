import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { forgetLogo, knownLogo, lastLogo, LogoChoice, logoFit } from '../home/logo';
import { logoList, resolveLogo } from '../home/logoArt';

interface Props {
    appId: number;
    name: string;
    /** Settings: the game's logo instead of its name. */
    logo: boolean;
    /** The title text's class (Home `gh-title`, the game page `gg-title`). */
    className: string;
    /** The logo image's class (Home `gh-logo`, the game page `gg-logo`). */
    logoClassName: string;
    /** A canvas length in the page's unit (Home: px; the game page: its scale unit). */
    unit(n: number): string;
    /** Changes when Steam has loaded more games' details (Home), so a logo file name it now knows is tried. */
    version?: number;
}

/** The logo cropped to its visible part and sized by area (home/logo.logoFit). */
function logoStyle(choice: LogoChoice, unit: (n: number) => string): CSSProperties {
    const fit = logoFit(choice.trim, choice.natural);
    const style: CSSProperties = { width: unit(fit.width), height: unit(fit.height), maxWidth: 'none', maxHeight: 'none' };
    if (fit.viewBox) (style as Record<string, string>).objectViewBox = fit.viewBox;
    return style;
}

/**
 * The game's name, or with the logo option its logo (home/logoArt: resolved once per game, shared, remembered and
 * pre-loaded for the neighbours, like the hero art). A logo already resolved draws on the same frame, at its final size;
 * one still loading leaves the slot empty, so the name never flashes before it. The name is the fallback: no logo listed,
 * none loading, or no app id (Home's library tile). Shared by Home and the game page.
 */
export function GameTitle({ appId, name, logo, className, logoClassName, unit, version = 0 }: Props) {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const list = useMemo(() => (logo ? logoList(appId) : { urls: [], key: '' }), [logo, appId, version]);
    const known = logo ? knownLogo(appId, list.key) : null;
    const [resolved, setResolved] = useState<{ appId: number; key: string; choice: LogoChoice | null } | null>(null);
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        if (!logo || known !== undefined || list.urls.length === 0) return undefined;
        let live = true;
        resolveLogo(appId, list).then((choice) => {
            if (live) setResolved({ appId, key: list.key, choice });
        });
        return () => {
            live = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [logo, appId, list.key, retry]);

    const fresh = known !== undefined ? known : resolved && resolved.appId === appId && resolved.key === list.key ? resolved.choice : undefined;
    // While a better source loads (Steam just listed the local file), the logo it had stays up.
    const choice = fresh === undefined && logo ? lastLogo(appId) ?? undefined : fresh;
    if (!logo || list.urls.length === 0 || choice === null) return <div className={className}>{name}</div>;
    if (choice === undefined) return null;
    return (
        <img
            key={`${appId}:${choice.url}`}
            className={logoClassName}
            style={logoStyle(choice, unit)}
            src={choice.url}
            alt={name}
            crossOrigin="anonymous"
            onError={() => {
                // A remembered logo that no longer loads (art removed): look again, once; then the name.
                forgetLogo(appId);
                if (retry === 0) {
                    setResolved(null);
                    setRetry(1);
                } else setResolved({ appId, key: list.key, choice: null });
            }}
        />
    );
}
