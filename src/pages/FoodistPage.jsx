// /localkitchen — the Local Kitchen venue page.
// The backend continues to use the foodist venue identity for booking data,
// while the public-facing display and route are renamed to Local Kitchen.
import React from 'react';
import VenuePage from '../components/venues/VenuePage';

const LocalKitchenPage = () => (
  <VenuePage slug="foodist" path="/localkitchen" displayName="Local Kitchen" />
);

export default LocalKitchenPage;
