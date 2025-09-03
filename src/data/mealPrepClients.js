// Define Meal Prep client profiles and the login emails that should map to them.
// Fill in the emails for each client to enable automatic linking after sign-in.

export const mealPrepClients = [
  {
    key: 'davidAllison',
    name: 'David & Allison',
    clientName: 'David and Allison',
    emails: [
      // 'david@example.com', 'allison@example.com'
    ],
  },
  {
    key: 'sanjay',
    name: 'Sanjay',
    clientName: 'Sanjay',
    emails: [
      // 'sanjay@example.com'
    ],
  },
  {
    key: 'shelley',
    name: 'Shelley',
    clientName: 'Shelley',
    emails: [
      // 'shelley@example.com'
    ],
  },
];

export function getAssignedClientNameForUser(user) {
  if (!user) return null;
  const email = (user.email || '').toLowerCase();
  const name = (user.displayName || '').toLowerCase();

  // 1) Email mapping wins
  for (const c of mealPrepClients) {
    for (const e of c.emails) {
      if (email && e && email === String(e).toLowerCase()) return c.clientName;
    }
  }

  // 2) Heuristic based on display name
  if (name.includes('sanjay')) return 'Sanjay';
  if (name.includes('shelley')) return 'Shelley';
  if (name.includes('david') || name.includes('allison')) return 'David and Allison';

  return null;
}
