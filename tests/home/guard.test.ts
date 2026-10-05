import { describe, expect, it } from 'vitest';
import { isKnownHomeShape } from '../../src/home/guard';
import fixture from './fixtures/home-route.json';

// Rebuilds the captured structure as a live object: symbols and functions cannot live in JSON.
function realShape(): { path: unknown; children: Record<string, unknown> } {
    const { children } = fixture.routeProps;
    return {
        path: fixture.routeProps.path,
        children: {
            $$typeof: Symbol.for('react.transitional.element'),
            type: () => null,
            key: children.key,
            ref: children.ref,
            props: { ...children.props },
        },
    };
}

describe('isKnownHomeShape', () => {
    it('isKnownHomeShape accepts the captured real shape', () => {
        expect(isKnownHomeShape(realShape())).toBe(true);
    });

    it('isKnownHomeShape rejects null, undefined, a missing renderFunc and a changed shape', () => {
        expect(isKnownHomeShape(null)).toBe(false);
        expect(isKnownHomeShape(undefined)).toBe(false);
        expect(isKnownHomeShape('home')).toBe(false);
        expect(isKnownHomeShape({})).toBe(false);

        // The Home route has no renderFunc; a route that only has one (the app page shape) is not Home.
        expect(isKnownHomeShape({ path: '/library/home', renderFunc: () => null })).toBe(false);

        const missingChildren = realShape() as Record<string, unknown>;
        delete missingChildren.children;
        expect(isKnownHomeShape(missingChildren)).toBe(false);

        const otherPath = realShape();
        otherPath.path = '/library/app/:appid';
        expect(isKnownHomeShape(otherPath)).toBe(false);

        const routesPrefix = realShape();
        routesPrefix.path = '/routes/library/home';
        expect(isKnownHomeShape(routesPrefix)).toBe(false);

        const gainedProps = realShape();
        gainedProps.children.props = { renderFunc: () => null };
        expect(isKnownHomeShape(gainedProps)).toBe(false);

        const notAnElement = realShape();
        delete notAnElement.children.$$typeof;
        expect(isKnownHomeShape(notAnElement)).toBe(false);

        const noType = realShape();
        noType.children.type = undefined;
        expect(isKnownHomeShape(noType)).toBe(false);

        const nullProps = realShape();
        nullProps.children.props = null;
        expect(isKnownHomeShape(nullProps)).toBe(false);
    });

    it('isKnownHomeShape never throws on circular or throwing getters', () => {
        const circular = realShape() as Record<string, unknown>;
        circular.self = circular;
        (circular.children as Record<string, unknown>).owner = circular;
        expect(() => isKnownHomeShape(circular)).not.toThrow();
        expect(isKnownHomeShape(circular)).toBe(true);

        const throwingPath = Object.defineProperty({}, 'path', {
            get() {
                throw new Error('boom');
            },
        });
        expect(() => isKnownHomeShape(throwingPath)).not.toThrow();
        expect(isKnownHomeShape(throwingPath)).toBe(false);

        const throwingChildren = realShape();
        Object.defineProperty(throwingChildren.children, 'props', {
            get() {
                throw new Error('boom');
            },
        });
        expect(() => isKnownHomeShape(throwingChildren)).not.toThrow();
        expect(isKnownHomeShape(throwingChildren)).toBe(false);

        const throwingProxy = new Proxy(
            {},
            {
                get() {
                    throw new Error('boom');
                },
                ownKeys() {
                    throw new Error('boom');
                },
            },
        );
        expect(() => isKnownHomeShape(throwingProxy)).not.toThrow();
        expect(isKnownHomeShape(throwingProxy)).toBe(false);
    });
});
