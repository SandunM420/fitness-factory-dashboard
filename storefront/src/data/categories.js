export const categories = [
  { slug: 'protein', name: 'Protein', note: 'Build and recover', mark: 'P', image: 'category-protein' },
  { slug: 'creatine', name: 'Creatine', note: 'Power every rep', mark: 'C', image: 'category-creatine' },
  { slug: 'pre-workouts', name: 'Pre-Workouts', note: 'Energy and focus', mark: 'PW', image: 'category-pre-workouts' },
  { slug: 'fat-burners', name: 'Fat Burners', note: 'Support your goal', mark: 'FB', image: 'category-fat-burners' },
  { slug: 'recovery', name: 'Recovery', note: 'Reset and rebuild', mark: 'R', image: 'category-recovery' },
  { slug: 'accessories', name: 'Accessories', note: 'Train prepared', mark: 'A', image: 'category-accessories' },
];

export const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
