// /foodist — one of the two Local Effort event spaces.
// Everything lives in the shared shell; the only thing a venue page carries is
// which room it is. Facts: src/config/venues.json. Design: docs/design/VENUES.md
import React from 'react';
import VenuePage from '../components/venues/VenuePage';

const FoodistPage = () => <VenuePage slug="foodist" path="/foodist" />;

export default FoodistPage;
