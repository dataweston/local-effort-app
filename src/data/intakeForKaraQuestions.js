export const INTAKE_FOR_KARA_QUESTIONS = [
  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 1: Welcome
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'intro',
    type: 'intro',
    category: 'Welcome',
    title: 'Meal Plan for Kara',
    prompt: 'Congratulations on your growing family! Let\'s plan nourishing meals for your first weeks with baby.',
    helper: 'This takes about 5 minutes. We\'ll learn what Kara and Dad each love (and don\'t love) to eat.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 2: Contact & Timing (grouped)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'contact_timing',
    type: 'group',
    category: 'Getting Started',
    prompt: 'Contact info & timing',
    helper: 'We\'ll use this to coordinate delivery.',
    fields: [
      { id: 'email', type: 'text', label: 'Best email for updates', placeholder: 'you@email.com' },
      { id: 'phone', type: 'text', label: 'Phone number', placeholder: '(555) 555-5555' },
      { id: 'address', type: 'text', label: 'Delivery address', placeholder: '123 Main St, City, State ZIP' },
      { id: 'due_date', type: 'date', label: 'When is baby due (or when did baby arrive)?' },
      { id: 'first_delivery', type: 'date', label: 'When should meal deliveries start?' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 3: Kara — Proteins (combined checkbox + everyday picker)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'kara_proteins',
    type: 'protein-picker',
    category: 'Kara\'s Preferences',
    prompt: 'Which proteins does Kara enjoy?',
    helper: 'Check all she likes. Mark any as "could eat every day."',
    options: ['Chicken', 'Beef', 'Pork', 'Lamb', 'Fish/Seafood', 'Tofu/Tempeh', 'Eggs', 'Beans/Legumes'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 4: Kara — Favorites, Dislikes, Allergies (grouped)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'kara_details',
    type: 'group',
    category: 'Kara\'s Preferences',
    prompt: 'What does Kara love and avoid?',
    fields: [
      { id: 'kara_favorites', type: 'textarea', label: 'Favorite foods or dishes', placeholder: 'e.g., Tacos, pasta, stir fry, grilled salmon...' },
      { id: 'kara_dislikes', type: 'textarea', label: 'Foods she strongly dislikes', placeholder: 'e.g., Mushrooms, olives, cilantro...' },
      { id: 'kara_allergies', type: 'textarea', label: 'Allergies or intolerances', placeholder: 'e.g., Tree nuts, gluten intolerance...' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 5: Dad — Proteins (combined checkbox + everyday picker)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'dad_proteins',
    type: 'protein-picker',
    category: 'Dad\'s Preferences',
    prompt: 'Which proteins does Dad enjoy?',
    helper: 'Check all he likes. Mark any as "could eat every day."',
    options: ['Chicken', 'Beef', 'Pork', 'Lamb', 'Fish/Seafood', 'Tofu/Tempeh', 'Eggs', 'Beans/Legumes'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 6: Dad — Favorites, Dislikes, Allergies (grouped)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'dad_details',
    type: 'group',
    category: 'Dad\'s Preferences',
    prompt: 'What does Dad love and avoid?',
    fields: [
      { id: 'dad_favorites', type: 'textarea', label: 'Favorite foods or dishes', placeholder: 'e.g., BBQ ribs, sushi bowls, chicken parm...' },
      { id: 'dad_dislikes', type: 'textarea', label: 'Foods he strongly dislikes', placeholder: 'e.g., Spicy food, bell peppers, eggplant...' },
      { id: 'dad_allergies', type: 'textarea', label: 'Allergies or intolerances', placeholder: 'e.g., Soy allergy, dairy-free...' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 7: Postpartum Needs
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'postpartum',
    type: 'group',
    category: 'Postpartum Needs',
    prompt: 'Recovery & nursing priorities',
    helper: 'Helps us focus on the right nutrients.',
    fields: [
      {
        id: 'breastfeeding',
        type: 'radio',
        label: 'Planning to breastfeed?',
        options: ['Yes, exclusively', 'Yes, mixed with formula', 'No / Not sure yet'],
        
      },
      {
        id: 'postpartum_priorities',
        type: 'checkbox',
        label: 'Top priorities for recovery meals',
        options: [
          'Energy & stamina',
          'Lactation support',
          'Iron-rich foods',
          'Anti-inflammatory',
          'High protein for healing',
          'Easy to eat one-handed',
          'Comfort food vibes',
          'Light & easy to digest',
        ],
        
      },
      { id: 'postpartum_concerns', type: 'textarea', label: 'Any specific concerns?', placeholder: 'e.g., C-section recovery, blood sugar, gas-producing foods...' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 8: Meal Logistics (grouped)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'logistics',
    type: 'group',
    category: 'Meal Logistics',
    prompt: 'How & where you\'ll eat',
    helper: 'Helps us package meals appropriately.',
    fields: [
      {
        id: 'lunches_together',
        type: 'radio',
        label: 'For the 3 weekly lunches — together or separate?',
        options: ['Together (same meal)', 'Separately (different meals)', 'Mix of both'],
        
      },
      {
        id: 'dinners_together',
        type: 'radio',
        label: 'For the 3 weekly dinners — together or separate?',
        options: ['Together (same meal)', 'Separately (different meals)', 'Mix of both'],
        
      },
      {
        id: 'lunch_settings',
        type: 'checkbox',
        label: 'Where will lunches be eaten?',
        options: ['At home', 'At the office', 'On the go', 'Varies'],
        
      },
      {
        id: 'dinner_settings',
        type: 'checkbox',
        label: 'Where will dinners be eaten?',
        options: ['At home (sit-down)', 'At home (grab-and-go)', 'Reheated at work', 'Varies'],
        
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 9: Cuisine & Spice (grouped)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'flavors',
    type: 'group',
    category: 'Flavors',
    prompt: 'Cuisines & spice level',
    fields: [
      {
        id: 'cuisine_preferences',
        type: 'checkbox',
        label: 'Cuisines you both enjoy',
        options: [
          'Mediterranean',
          'Midwest comfort',
          'Asian-inspired',
          'Mexican / Latin',
          'Italian',
          'Southern / BBQ',
          'Middle Eastern',
          'Classic American',
          'Surprise us',
        ],
        
      },
      {
        id: 'spice_level',
        type: 'radio',
        label: 'Preferred spice level',
        options: ['No spice', 'Mild', 'Medium', 'Spicy'],
        
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 10: Breakfast & Snacks (grouped)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'extras',
    type: 'group',
    category: 'Extras',
    prompt: 'Breakfast & snack add-ons',
    helper: 'Optional items we can include.',
    fields: [
      {
        id: 'breakfast_interest',
        type: 'radio',
        label: 'Include breakfast options?',
        options: ['Yes, please', 'Maybe — tell me more', 'No thanks'],
      },
      {
        id: 'breakfast_types',
        type: 'checkbox',
        label: 'Breakfast styles that interest you',
        options: ['Overnight oats / lactation oats', 'Egg muffins', 'Smoothie packs', 'Breakfast burritos', 'Pancakes / waffles', 'Energy bites'],
      },
      {
        id: 'snacks_interest',
        type: 'radio',
        label: 'Include snacks or desserts?',
        options: ['Snacks only', 'Desserts only', 'Both snacks & desserts', 'No thanks'],
      },
      { id: 'snack_requests', type: 'textarea', label: 'Any specific requests?', placeholder: 'e.g., Lactation cookies, protein balls, brownies...' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 11: Final Details (grouped)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'final',
    type: 'group',
    category: 'Final Details',
    prompt: 'Delivery & billing',
    fields: [
      {
        id: 'monday_delivery',
        type: 'radio',
        label: 'Is Monday an OK delivery day?',
        options: ['Yes, Monday works', 'No, please suggest an alternative'],
      },
      { id: 'alt_delivery_day', type: 'text', label: 'If not Monday, which day works best?', placeholder: 'e.g., Tuesday, Wednesday...' },
      {
        id: 'billing_preference',
        type: 'radio',
        label: 'Billing preference',
        options: ['Weekly billing', 'Monthly billing (saves 10%)'],
      },
      { id: 'delivery_notes', type: 'textarea', label: 'Delivery instructions', placeholder: 'e.g., Leave at front door, ring doorbell...' },
      { id: 'anything_else', type: 'textarea', label: 'Anything else we should know?', placeholder: 'Favorite comfort meals, family recipes...' },
    ],
  },
];
