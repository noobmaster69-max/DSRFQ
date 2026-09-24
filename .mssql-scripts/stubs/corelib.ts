/**
 * Just enough of @serenity-is/corelib for the node unit tests of modules that
 * build list criteria (BallooningDatabaseService). Criteria become plain
 * arrays so a test can read what was asked for.
 */

export function Criteria(field: string) {
    return {
        eq: (v: unknown) => [field, '=', v],
        in: (v: unknown) => [field, 'in', v],
    };
}
Criteria.and = (...parts: unknown[]) => ['and', ...parts];
Criteria.or = (...parts: unknown[]) => ['or', ...parts];

export const notifyError = (..._a: unknown[]) => {};
export const notifyWarning = (..._a: unknown[]) => {};
export const notifySuccess = (..._a: unknown[]) => {};
export const Authorization = { hasPermission: () => true, userDefinition: { Username: 'test' } };
