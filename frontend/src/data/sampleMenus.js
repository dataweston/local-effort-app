// src/data/sampleMenus.js

export const sampleMenus = [
  {
    id: "cabin-dinner-12-may",
    title: "Cabin Dinner for 12",
    subtitle: "Spring seasonal menu",
    eventType: "private-dinner",
    date: "2024-05-10",
    image: "/images/cabin-dinner.jpg",
    tags: ["spring", "seasonal", "private"],
    sections: [
      {
        course: "Appetizer",
        items: [
          { name: "Sourdough focaccia", note: "spring herbs" },
          { name: "Roasted beets over labneh", note: "local beets, yogurt, citrus, hazelnut" },
          { name: "Asparagus salad", note: "bacon, hazelnut, parmesan" },
          { name: "Agnolotti", note: "ricotta + gouda, butter, crispy mushroom, honey" }
        ]
      },
      {
        course: "Main",
        items: [
          { name: "Rainbow trout", note: "raised in Forest Hills, wrapped in fennel + cabbage, asparagus, potato purée" },
          { name: "Chicken ballotine", note: "with carrots, ramps, sherry jus" }
        ]
      },
      {
        course: "Dessert",
        items: [{ name: "Strawberry shortcake" }]
      }
    ]
  },
  {
    id: "office-party-20",
    title: "Office Party for 20",
    subtitle: "Stationary appetizers",
    eventType: "corporate",
    date: "2024-06-15",
    image: "/images/office-party.jpg",
    tags: ["corporate", "appetizers"],
    sections: [
      {
        course: "Appetizers",
        items: [
          { name: "Charcuterie spread", note: "duck breast prosciutto, beef bresaola, gouda, camembert, hazelnuts, pickles, flax crackers, jam, pâté" },
          { name: "Sourdough focaccia", note: "herbes de provence" },
          { name: "Beets over labneh", note: "local beets, yogurt, citrus, hazelnut" },
          { name: "Carrot salad", note: "julienned, cilantro + pistachio" },
          { name: "Duck pastrami sliders", note: "fresh buns, aioli, pickled cabbage" }
        ]
      }
    ]
  },
  {
    id: "gala-13",
    title: "University Gala Dinner",
    subtitle: "13 guests, home event",
    eventType: "gala",
    date: "2024-04-22",
    image: "/images/university-gala.jpg",
    tags: ["formal", "multi-course"],
    sections: [
      {
        course: "Passed Apps",
        items: [
          { name: "Grilled lamb loin skewers", note: "onion + mint" },
          { name: "Grilled vegetable skewers", note: "early season" },
          { name: "Walleye brandade", note: "house crackers" }
        ]
      },
      {
        course: "Appetizer",
        items: [
          { name: "Pork Belly Porchetta", note: "spaetzle, peas + carrots, applesauce" },
          { name: "Sourdough focaccia", note: "for the table" }
        ]
      },
      {
        course: "Main",
        items: [
          { name: "Duck leg confit", note: "red polenta, mushrooms" },
          { name: "Alaskan sockeye", note: "charred cabbage, fennel, crispy potatoes" },
          { name: "Pheasant ballotine", note: "mushroom, carrot, celery root purée" }
        ]
      },
      {
        course: "Dessert",
        items: [
          { name: "Citrus tart", note: "blood orange, Meyer lemon, kumquat" },
          { name: "Torta Caprese", note: "dense chocolate hazelnut cake" }
        ]
      }
    ]
  },
  {
    id: "bar-brava-industry",
    title: "Bar Brava Industry Night",
    subtitle: "Casual plates + desserts",
    eventType: "industry-night",
    date: "2024-07-01",
    image: "/images/bar-brava.jpg",
    tags: ["casual", "bar"],
    sections: [
      {
        course: "Menu",
        items: [
          { name: "Sloppy Joe", note: "potato bun, purple slaw, onion" },
          { name: "Pâté en Croute", note: "lamb + duck, watercress, mustard" },
          { name: "Lamb neck", note: "white beans, leek confit, tomato vinaigrette" },
          { name: "Chef's Big Salad", note: "greens, beets, carrots, potatoes, add trout" },
          { name: "Cheese and crackers", note: "jam" },
          { name: "Duck prosciutto", note: "pickles" },
          { name: "Sourdough focaccia" }
        ]
      },
      {
        course: "Dessert",
        items: [
          { name: "Carrot cake" },
          { name: "Hazelnut butter cup" }
        ]
      }
    ]
  },
  {
    id: "wedding-jan-60",
    title: "January Wedding for 60",
    subtitle: "Winter wedding feast",
    eventType: "wedding",
    date: "2024-01-20",
    image: "/images/january-wedding.jpg",
    tags: ["wedding", "winter"],
    sections: [
      {
        course: "Stationary",
        items: [
          { name: "Charcuterie and cheese", note: "duck prosciutto, local meats, pickles, nuts, chips, jams, bread + crackers, dips" }
        ]
      },
      {
        course: "Passed",
        items: [
          { name: "Squash toast", note: "ricotta, roasted kabocha, sage honey, chili flake, olive oil" },
          { name: "Charred Date Cruller Bites", note: "pork skin, balsamic" }
        ]
      },
      {
        course: "Vegetable Dishes",
        items: [
          { name: "White wine-poached leeks", note: "mustard vinaigrette" },
          { name: "Roasted beets over labneh", note: "citrus, hazelnuts" },
          { name: "Smoky cauliflower", note: "lemon cream, watercress, pistachio dukkuh" },
          { name: "Raw carrots", note: "cilantro + pistachio" },
          { name: "Roasted chicories + cabbages", note: "goat cheese, pepitas, citrus" },
          { name: "Purple sweet potato salad", note: "tahini aioli, red onion, hominy" }
        ]
      },
      {
        course: "Meat Dishes",
        items: [
          { name: "Braised bison + spaetzle", note: "carrots + peas" },
          { name: "Cassoulet", note: "duck confit, white bean, lamb sausage" },
          { name: "Chicken ballotine", note: "mushroom + gravy" },
          { name: "Rainbow trout", note: "potato galette, gruyere" }
        ]
      },
      {
        course: "Desserts",
        items: [
          { name: "Cookie plates", note: "cardamom citrus shortbread, hazelnut linzer, cranberry oat bars" }
        ]
      }
    ]
  },
  {
    id: "wedding-spring-130",
    title: "Late Spring Wedding for 130",
    subtitle: "Shared plates + mains",
    eventType: "wedding",
    date: "2024-05-25",
    image: "/images/spring-wedding.jpg",
    tags: ["wedding", "spring"],
    sections: [
      {
        course: "Appetizers",
        items: [
          { name: "Sourdough focaccia breadsticks" },
          { name: "All-belly Porchetta", note: "braised in cider" },
          { name: "Lamb + vegetable skewers" },
          { name: "Crackers, pickles + fish", note: "walleye brandade" },
          { name: "Crudité", note: "bagna cauda" },
          { name: "Lamb hand pies", note: "carrots, potatoes, peas" }
        ]
      },
      {
        course: "Main",
        items: [
          { name: "Duck leg confit", note: "red polenta, grilled asparagus" },
          { name: "Alaskan sockeye", note: "wild mushroom risotto, peas" }
        ]
      },
      {
        course: "Desserts",
        items: [
          { name: "Hazelnut linzer with jam" },
          { name: "Millionaire shortbread" },
          { name: "Coconut macaron" },
          { name: "Cornish Fairing" }
        ]
      }
    ]
  },
  {
    id: "bachelorette-11",
    title: "Bachelorette Party",
    subtitle: "Summer, 11 guests",
    eventType: "private-party",
    date: "2024-08-12",
    image: "/images/bachelorette.jpg",
    tags: ["summer", "party"],
    sections: [
      {
        course: "Appetizer",
        items: [
          { name: "Sourdough focaccia", note: "basil + cherry tomato" },
          { name: "Prosciutto + melon" },
          { name: "Snap pea salad", note: "yogurt, strawberry, hazelnut" }
        ]
      },
      {
        course: "Main",
        items: [
          { name: "Sockeye salmon" },
          { name: "Hanger steak" },
          { name: "Chicken breast paillard", note: "with grilled corn + squash, fregola sarda, heirloom tomato" }
        ]
      },
      {
        course: "Dessert",
        items: [{ name: "Blueberry tart", note: "vanilla crème" }]
      }
    ]
  },
  {
    id: "xmas-party-50-1",
    title: "Christmas Work Party - Sample 1",
    subtitle: "Home event, 50 guests",
    eventType: "holiday",
    date: "2023-12-20",
    image: "/images/xmas1.jpg",
    tags: ["holiday", "buffet"],
    sections: [
      {
        course: "Appetizers",
        items: [
          { name: "Salo", note: "cured pork fat, garlic, bread, pickles" },
          { name: "Stuffed cabbage rolls" },
          { name: "Beets with dill" },
          { name: "Mushroom-filled potatoes" },
          { name: "Watermelon (fresh + pickled)" },
          { name: "Seasonal greens" },
          { name: "Olive salad" }
        ]
      },
      {
        course: "Main",
        items: [
          { name: "Shashlik (kabobs)", note: "chicken, steak, lamb, vegetables, sauces" }
        ]
      }
    ]
  },
  {
    id: "xmas-party-50-2",
    title: "Christmas Work Party - Sample 2",
    subtitle: "Home event, 50 guests",
    eventType: "holiday",
    date: "2023-12-20",
    image: "/images/xmas2.jpg",
    tags: ["holiday", "formal"],
    sections: [
      {
        course: "Appetizer",
        items: [
          { name: "Sourdough focaccia", note: "olive oil + za'atar" },
          { name: "Fresh ricotta" },
          { name: "Spring/summer salad", note: "seasonal" }
        ]
      },
      {
        course: "Mid-course",
        items: [
          { name: "Agnolotti", note: "artichoke + shiitake, crispy sunchokes, honey" }
        ]
      },
      {
        course: "Main",
        items: [
          { name: "Beef tenderloin", note: "foie gras butter, leek ash" },
          { name: "Asparagus", note: "cured egg yolk, parmesan" }
        ]
      },
      {
        course: "Dessert",
        items: [
          { name: "Raspberry marshmallow", note: "chocolate graham shortbread" },
          { name: "Cognac or Scotch" }
        ]
      }
    ]
  },
  {
    id: "xmas-party-50-3",
    title: "Christmas Work Party - Sample 3",
    subtitle: "Home event, 50 guests",
    eventType: "holiday",
    date: "2023-12-20",
    image: "/images/xmas3.jpg",
    tags: ["holiday"],
    sections: [
      {
        course: "Stationary",
        items: [
          { name: "Charcuterie + cheese", note: "local + imported, crudités, olives, jams, nuts, pickles, chips, crackers" },
          { name: "Fresh bread", note: "focaccia, baguette, olive oil, butter" }
        ]
      },
      {
        course: "Passed",
        items: [
          { name: "Carrot salad", note: "pistachio + cilantro" },
          { name: "Frites" },
          { name: "Onion sandwich", note: "mayo, parsley, white bread" },
          { name: "Duck egg", note: "duck bacon, asparagus" },
          { name: "Scallop and apple" },
          { name: "Short rib nigiri" },
          { name: "Croque Monsieur" }
        ]
      },
      {
        course: "Desserts",
        items: [
          { name: "Cookie plate", note: "chocolate chip, hazelnut linzer, third rotating" },
          { name: "Citrus chiffon Twinkies", note: "foie gras buttercream" },
          { name: "Japanese cheesecake" }
        ]
      }
    ]
  },
  {
    id: "xmas-party-50-4",
    title: "Christmas Work Party - Sample 4",
    subtitle: "Home event, 50 guests",
    eventType: "holiday",
    date: "2023-12-20",
    image: "/images/xmas4.jpg",
    tags: ["holiday"],
    sections: [
      {
        course: "Stationary",
        items: [
          { name: "Charcuterie + cheese platters", note: "bresaola, cured pork, olives, beets, tomato jam, cheeses, walnuts, duck rillettes, house crackers + chips" },
          { name: "Garlic focaccia" },
          { name: "Carrot salad", note: "pistachio + coriander" }
        ]
      },
      {
        course: "Passed",
        items: [
          { name: "Duck egg with duck pastrami" },
          { name: "Kabocha squash toast", note: "ricotta + persimmon honey" },
          { name: "Beef tenderloin", note: "leek + corn ash, foie gras butter" }
        ]
      },
      {
        course: "Desserts",
        items: [
          { name: "Cookies + bars" },
          { name: "Persimmon cake", note: "cranberry" },
          { name: "Hot chocolate", note: "marshmallows, peppermint schnapps" }
        ]
      }
    ]
  }
];
