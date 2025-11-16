const { getSanityClient } = require('./backend/api/sanityClient');

async function checkContacts() {
  const client = getSanityClient();
  
  if (!client) {
    console.log('❌ Sanity client not available. Check SANITY_PROJECT_ID env variable.');
    return;
  }

  try {
    const contacts = await client.fetch(`*[_type == "contact"] | order(_createdAt desc) [0...10] {
      _id,
      email,
      firstName,
      lastName,
      phone,
      tags,
      updatedAt,
      _createdAt
    }`);

    console.log(`\n📧 Found ${contacts.length} contacts (showing up to 10 most recent):\n`);
    
    if (contacts.length === 0) {
      console.log('No contacts found in Sanity.');
    } else {
      contacts.forEach((contact, index) => {
        console.log(`${index + 1}. ${contact.email}`);
        if (contact.firstName || contact.lastName) {
          console.log(`   Name: ${contact.firstName || ''} ${contact.lastName || ''}`);
        }
        if (contact.phone) {
          console.log(`   Phone: ${contact.phone}`);
        }
        if (contact.tags && contact.tags.length > 0) {
          console.log(`   Tags: ${contact.tags.join(', ')}`);
        }
        console.log(`   Created: ${contact._createdAt || 'N/A'}`);
        console.log('');
      });
    }

    // Get total count
    const total = await client.fetch(`count(*[_type == "contact"])`);
    console.log(`\nTotal contacts in database: ${total}\n`);

  } catch (error) {
    console.error('❌ Error fetching contacts:', error.message);
  }
}

checkContacts();
