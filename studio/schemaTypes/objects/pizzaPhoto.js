import React from 'react'
import PizzaPhotoInput from '../../components/PizzaPhotoInput.jsx'
import cloudinary from '../../../shared/cloudinary.json'

// One page photo, chosen from Cloudinary. The picker (PizzaPhotoInput) fills in
// publicId and, when Cloudinary has one, the description; `publicId` is hidden
// from the form because the picker owns it, so the photo itself is validated
// at the object level.
export default {
  name: 'pizzaPhoto',
  title: 'Photo',
  type: 'object',
  components: {input: PizzaPhotoInput},
  fields: [
    {name: 'publicId', title: 'Cloudinary photo', type: 'string', hidden: true},
    {
      name: 'alt',
      title: 'Describe the photo',
      type: 'string',
      description:
        'One plain sentence for people who cannot see it, e.g. “A slice pulled from a pepperoni pizza on a wooden board”.',
      validation: (Rule) => Rule.required().max(200),
    },
  ],
  validation: (Rule) =>
    Rule.custom((value) => (value?.publicId ? true : 'Choose a photo from Cloudinary.')),
  preview: {
    select: {publicId: 'publicId', alt: 'alt'},
    prepare({publicId, alt}) {
      return {
        title: alt || 'Photo needs a description',
        subtitle: publicId,
        media: publicId
          ? () =>
              React.createElement('img', {
                src: `https://res.cloudinary.com/${cloudinary.cloudName}/image/upload/c_fill,g_auto,w_96,h_96,f_auto,q_auto/${publicId}`,
                alt: '',
                style: {width: '100%', height: '100%', objectFit: 'cover'},
              })
          : undefined,
      }
    },
  },
}
