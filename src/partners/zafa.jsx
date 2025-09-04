import React from 'react';

// Safe stub: real ZAFA app is not included in production build by default.
// To enable locally, set VITE_ENABLE_ZAFA=true and adjust vite alias.
export default function ZafaStub() {
	return (
		<div style={{ padding: 24 }}>
			<h2>ZAFA Events</h2>
			<p>The ZAFA partner tool isn't enabled in this build.</p>
		</div>
	);
}
