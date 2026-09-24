/**
 * Lets the node unit tests import the widget's TypeScript directly.
 *
 * The modules under test are pure logic, but they reach the shop's settings
 * through BallooningSettingsStore, which talks to a Serenity service and to
 * localStorage. Neither exists under bare node, and neither is what these tests
 * are about, so the import is redirected to an in-memory stub.
 *
 * Used with:  node --experimental-strip-types --import ./ts-stub-loader.mjs ...
 */
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const STUBS = {
    BallooningSettingsStore: resolve(here, 'stubs', 'BallooningSettingsStore.ts'),
};

registerHooks({
    resolve(specifier, context, nextResolve) {
        // Serenity itself and the generated service types need a browser and a
        // server; BallooningDatabaseService only needs their shape.
        if (specifier === '@serenity-is/corelib')
            return { url: pathToFileURL(resolve(here, 'stubs', 'corelib.ts')).href, shortCircuit: true };
        if (specifier.startsWith('@/ServerTypes/'))
            return { url: pathToFileURL(resolve(here, 'stubs', 'ServerTypes.ts')).href, shortCircuit: true };
        for (const [name, file] of Object.entries(STUBS)) {
            if (specifier === name || specifier.endsWith('/' + name))
                return { url: pathToFileURL(file).href, shortCircuit: true };
        }
        try {
            return nextResolve(specifier, context);
        } catch (err) {
            // The app's own imports are extensionless, which the bundler
            // resolves and node does not. Retry with ".ts" rather than
            // requiring production code to carry extensions for the tests'
            // benefit.
            if (err?.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.'))
                return nextResolve(specifier + '.ts', context);
            throw err;
        }
    },
});
