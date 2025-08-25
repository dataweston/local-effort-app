import { AdvancedImage } from '@cloudinary/react';
import { Cloudinary } from '@cloudinary/url-gen';
import { fill } from "@cloudinary/url-gen/actions/resize";

// Initialize Cloudinary with your cloud name
const cld = new Cloudinary({
  cloud: {
    cloudName: 'dokyhfvyd' // Replace with your actual cloud name
  }
});

const CloudinaryImage = ({ publicId, width, height, alt }) => {
  // Use the public ID to get the image object from Cloudinary
  const myImage = cld.image(publicId);

  // Apply a transformation (e.g., resize to fill specified dimensions)
  myImage.resize(fill().width(width).height(height));

  return (
    <AdvancedImage cldImg={myImage} alt={alt} />
  );
};

export default CloudinaryImage;