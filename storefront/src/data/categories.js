export const categories = [
  { slug: 'protein', name: 'Protein', note: 'Build and recover', mark: 'P' },
  { slug: 'creatine', name: 'Creatine', note: 'Power every rep', mark: 'C' },
  { slug: 'pre-workouts', name: 'Pre-Workouts', note: 'Energy and focus', mark: 'PW' },
  { slug: 'fat-burners', name: 'Fat Burners', note: 'Support your goal', mark: 'FB' },
  { slug: 'recovery', name: 'Recovery', note: 'Reset and rebuild', mark: 'R' },
  { slug: 'accessories', name: 'Accessories', note: 'Train prepared', mark: 'A' },
];

export const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
