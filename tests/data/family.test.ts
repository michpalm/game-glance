import { describe, expect, it } from 'vitest';
import { accountIdOf, familyLabel, familyOwnerId, familyOwnerName } from '../../src/data/family';

describe('family library (Steam Families)', () => {
    // Probed on the Ally: a game from the family's library carries owner_account_id (an example id, a friend
    // named Lender); the user's own games have none.
    it('a game is borrowed when its overview names another account as owner', () => {
        expect(familyOwnerId({ owner_account_id: 1234567 }, 999)).toBe(1234567);
        expect(familyOwnerId({ subscribed_to: true }, 999)).toBeNull();
        expect(familyOwnerId({ owner_account_id: 999 }, 999)).toBeNull();
        expect(familyOwnerId({ owner_account_id: 0 }, 999)).toBeNull();
        expect(familyOwnerId(null, 999)).toBeNull();
        expect(familyOwnerId({ owner_account_id: 'x' }, null)).toBeNull();
    });
    it("the user's account id from their 64-bit Steam id", () => {
        expect(accountIdOf('76561197961500295')).toBe(1234567);
        expect(accountIdOf('junk')).toBeNull();
        expect(accountIdOf(undefined)).toBeNull();
    });
    it("the owner's name from the friends list, null when they are not on it", () => {
        const friends = [{ m_unAccountID: 1234567, display_name: 'Lender' }, { m_unAccountID: 5, display_name: '' }];
        expect(familyOwnerName(1234567, friends)).toBe('Lender');
        expect(familyOwnerName(5, friends)).toBeNull();
        expect(familyOwnerName(6, friends)).toBeNull();
        expect(familyOwnerName(6, undefined)).toBeNull();
    });
    it("Steam's own words, with the owner's name when known", () => {
        expect(familyLabel('Lender')).toBe('Family Sharing · Lender');
        expect(familyLabel(null)).toBe('Family Sharing');
    });
});
