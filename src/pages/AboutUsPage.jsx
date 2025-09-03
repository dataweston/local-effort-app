import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import sanityClient from '../sanityClient.js'; // explicit file extension for consistency
import CloudinaryImage from '../components/common/cloudinaryImage';
import { peoplePublicIds } from '../data/cloudinaryContent';

const AboutUsPage = () => {
  const [aboutData, setAboutData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSkill, setActiveSkill] = useState(null);

  useEffect(() => {
    // Limit fields we request to reduce payload size
    const query = `{
      "page": *[_type == "page" && slug.current == "about-us"][0]{ title, introduction },
  "persons": *[_type == "person"]{ name, role, bio, image{asset->{_ref}}, headshot{ asset{ public_id }, alt } },
      "skills": *[_type == "specialSkill"]{ name, description }
    }`;

    let mounted = true;
    (async () => {
      try {
        const data = await sanityClient.fetch(query);
        if (!mounted) return;
        setAboutData(data);
        if (data?.skills?.length) setActiveSkill(data.skills[0]);
      } catch (err) {
        console.error('Failed to load About page data:', err);
        setAboutData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!aboutData) return <div>Could not load page data.</div>;

  // By adding "= []", we ensure that if persons or skills don't exist,
  // we get an empty array instead of an error.
  const { page, persons = [], skills = [] } = aboutData;
  const weston = persons.find((p) => p.name && p.name.includes('Weston')) || {};
  const catherine = persons.find((p) => p.name && p.name.includes('Catherine')) || {};
  const westonPublicId = weston?.headshot?.asset?.public_id || peoplePublicIds.weston;
  const catherinePublicId = catherine?.headshot?.asset?.public_id || peoplePublicIds.catherine;

  return (
    <>
      <Helmet>
        <title>{page?.title || 'About Us'} | Local Effort</title>
        <meta
          name="description"
          content={page?.introduction || 'Meet the chefs behind Local Effort.'}
        />
      </Helmet>
      <div className="space-y-16">
        {/* This section will now show a message if the main page content is missing */}
        {!page && (
          <div className="card text-body bg-yellow-100 border-yellow-400">
            <strong>Content Missing:</strong> Please ensure a "Page" document with the exact slug
            "about-us" has been created and published in your Sanity Studio.
          </div>
        )}
        <h2 className="text-hero uppercase border-b border-gray-900 pb-4">{page?.title}</h2>
        <p className="text-body text-lg max-w-3xl">{page?.introduction}</p>

        {/* This section will now show a message if the person documents are missing */}
        <div className="grid md:grid-cols-2 gap-8">
          {persons.length === 0 && (
            <div className="card text-body md:col-span-2 bg-yellow-100 border-yellow-400">
              <strong>Content Missing:</strong> Please ensure "Person" documents for the team have
              been created and published in your Sanity Studio.
            </div>
          )}
      {(weston && (westonPublicId || weston.headshot)) && (
            <div className="card">
              <h3 className="text-heading">{weston.name}</h3>
        {westonPublicId ? (
                <div className="my-4">
                  <CloudinaryImage
          publicId={westonPublicId}
                    alt={weston.headshot.alt || weston.name}
                    width={600}
                    height={400}
          className="rounded-md w-full h-auto object-cover"
          fallbackSrc="/gallery/IMG_3145.jpg"
                  />
                </div>
              ) : null}
              <p className="text-body text-gray-600 mb-4">{weston.role}</p>
              <p className="text-body">{weston.bio}</p>
            </div>
          )}
      {(catherine && (catherinePublicId || catherine.headshot)) && (
            <div className="card">
              <h3 className="text-heading">{catherine.name}</h3>
        {catherinePublicId ? (
                <div className="my-4">
                  <CloudinaryImage
          publicId={catherinePublicId}
                    alt={catherine.headshot.alt || catherine.name}
                    width={600}
                    height={400}
          className="rounded-md w-full h-auto object-cover"
          fallbackSrc="/gallery/catherine.jpg"
                  />
                </div>
              ) : null}
              <p className="text-body text-gray-600 mb-4">{catherine.role}</p>
              <p className="text-body">{catherine.bio}</p>
            </div>
          )}
        </div>
        <div className="card">
          <h3 className="text-heading mb-4">Special Skills</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1 text-body flex flex-col space-y-2">
              {skills.map((skill) => (
                <button
                  key={skill.name}
                  onMouseEnter={() => setActiveSkill(skill)}
                  className={`text-left p-2 border-l-2 rounded-sm ${activeSkill?.name === skill.name ? 'border-[var(--color-accent)] bg-gray-200' : 'border-transparent hover:bg-gray-200'}`}
                >
                  {skill.name}
                </button>
              ))}
            </div>
            {activeSkill && (
              <div className="md:col-span-2 bg-gray-200 p-6 text-body min-h-[150px] rounded-md">
                <p>{activeSkill.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AboutUsPage;
