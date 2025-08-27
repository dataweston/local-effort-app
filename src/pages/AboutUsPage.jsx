import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import sanityClient from '../sanityClient'; // Make sure this path is correct

const AboutUsPage = () => {
    const [aboutData, setAboutData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSkill, setActiveSkill] = useState(null);

    useEffect(() => {
        // Query to get the page content, the two persons, and all special skills
        const query = `{
            "page": *[_type == "page" && slug.current == "about-us"][0],
            "persons": *[_type == "person"],
            "skills": *[_type == "specialSkill"]
        }`;

        sanityClient.fetch(query)
            .then((data) => {
                setAboutData(data);
                // Set the active skill only if skills exist
                if (data?.skills && data.skills.length > 0) {
                    setActiveSkill(data.skills[0]);
                }
                setLoading(false);
            })
            .catch(console.error);
    }, []);

    if (loading) return <div>Loading...</div>;
    if (!aboutData) return <div>Could not load page data.</div>;

    // By adding "= []", we ensure that if persons or skills don't exist,
    // we get an empty array instead of an error.
    const { page, persons = [], skills = [] } = aboutData;
    const weston = persons.find(p => p.name.includes("Weston"));
    const catherine = persons.find(p => p.name.includes("Catherine"));

    return (
        <>
            <Helmet>
                <title>{page?.title || 'About Us'} | Local Effort</title>
                <meta name="description" content={page?.introduction || "Meet the chefs behind Local Effort."} />
            </Helmet>
            <div className="space-y-16">
                {/* This section will now show a message if the main page content is missing */}
                {!page && (
                    <div className="card text-body bg-yellow-100 border-yellow-400">
                        <strong>Content Missing:</strong> Please ensure a "Page" document with the exact slug "about-us" has been created and published in your Sanity Studio.
                    </div>
                )}
                <h2 className="text-hero uppercase border-b border-gray-900 pb-4">{page?.title}</h2>
                <p className="text-body text-lg max-w-3xl">{page?.introduction}</p>
                
                {/* This section will now show a message if the person documents are missing */}
                <div className="grid md:grid-cols-2 gap-8">
                    {persons.length === 0 && (
                         <div className="card text-body md:col-span-2 bg-yellow-100 border-yellow-400">
                            <strong>Content Missing:</strong> Please ensure "Person" documents for the team have been created and published in your Sanity Studio.
                        </div>
                    )}
                    {weston && (
                        <div className="card">
                            <h3 className="text-heading">{weston.name}</h3>
                            {/* You would need to configure image URLs from Sanity */}
                            {/* <img src={urlFor(weston.image).url()} alt={weston.name} className="my-4 rounded-md" /> */}
                            <p className="text-body text-gray-600 mb-4">{weston.role}</p>
                            <p className="text-body">{weston.bio}</p>
                        </div>
                    )}
                    {catherine && (
                        <div className="card">
                            <h3 className="text-heading">{catherine.name}</h3>
                            {/* <img src={urlFor(catherine.image).url()} alt={catherine.name} className="my-4 rounded-md" /> */}
                            <p className="text-body text-gray-600 mb-4">{catherine.role}</p>
                            <p className="text-body">{catherine.bio}</p>
                        </div>
                    )}
                </div>
                 <div className="card">
                    <h3 className="text-heading mb-4">Special Skills</h3>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="md:col-span-1 text-body flex flex-col space-y-2">
                           {skills.map(skill => (
                               <button key={skill.name} onMouseEnter={() => setActiveSkill(skill)} className={`text-left p-2 border-l-2 rounded-sm ${activeSkill?.name === skill.name ? 'border-[var(--color-accent)] bg-gray-200' : 'border-transparent hover:bg-gray-200'}`}>
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
