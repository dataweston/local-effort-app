// public/gallery/photos.js

// To add a new photo, add a new block like this:
// {
//   src: "/gallery/your-image-name.jpg",
//   title: "A Catchy Title",
//   description: "A short, descriptive sentence about the photo."
// },

const photoData = [
  {
    src: "/gallery/placeholder1.jpg",
    title: "Sourdough Focaccia",
    description: "Handmade with local flour and spring herbs."
  },
  {
    src: "/gallery/placeholder2.jpg",
    title: "Agnolotti",
    description: "Fresh pasta filled with ricotta and gouda."
  },
  {
    src: "/gallery/placeholder3.jpg",
    title: "Duck Leg Confit",
    description: "Served over red polenta with wild mushrooms."
  },
  {
    src: "/gallery/placeholder4.jpg",
    title: "Hazelnut Linzer",
    description: "A beautiful and delicious dessert for any occasion."
  }
];

// Make sure this line is at the end of the file
window.photoData = photoData;
