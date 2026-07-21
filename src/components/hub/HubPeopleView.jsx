import React from 'react';
import { MessageSquare, UsersRound } from 'lucide-react';
import { Panel } from './hubShared';

export function PeopleView({ people, onMessage }) {
  return (
    <Panel title="People" icon={UsersRound}>
      <div className="hub-people-grid">
        {people.map((person) => (
          <div className="hub-person" key={person.id}>
            <strong>{person.displayName}</strong>
            <span>{person.title || person.accessLevel}</span>
            <small>{person.email}</small>
            <button onClick={() => onMessage(person)}><MessageSquare size={13} /> Message</button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

