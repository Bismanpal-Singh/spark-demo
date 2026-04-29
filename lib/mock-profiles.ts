export interface Profile {
  id: string
  name: string
  age: number
  city: string
  photos: string[]
  // Pre-unlock content (shown before sparking)
  previewBio: string
  previewInterests: string[]
  // Post-unlock content (shown after mutual spark)
  fullBio: string
  allInterests: string[]
  lookingFor: string
  funFact: string
}

export const mockProfiles: Profile[] = [
  {
    id: "1",
    name: "Emma",
    age: 26,
    city: "San Francisco",
    photos: [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=1000&fit=crop",
    ],
    previewBio: "Coffee enthusiast. Dog mom. Always planning my next adventure.",
    previewInterests: ["Travel", "Photography", "Hiking"],
    fullBio: "Coffee enthusiast. Dog mom. Always planning my next adventure. I believe life is too short for bad vibes and boring conversations. Currently training for my first half marathon while my golden retriever cheers me on.",
    allInterests: ["Travel", "Photography", "Hiking", "Coffee", "Running", "Dogs"],
    lookingFor: "Someone who can keep up with my energy and appreciates quiet Sunday mornings.",
    funFact: "I've visited 23 countries and counting!",
  },
  {
    id: "2",
    name: "Sophie",
    age: 28,
    city: "Los Angeles",
    photos: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=1000&fit=crop",
    ],
    previewBio: "Architect by day, amateur chef by night. Love Sunday farmers markets.",
    previewInterests: ["Cooking", "Design", "Art"],
    fullBio: "Architect by day, amateur chef by night. Looking for someone to share Sunday farmers markets and spontaneous road trips. I design buildings but I'm better at designing pasta dishes.",
    allInterests: ["Cooking", "Design", "Art", "Yoga", "Architecture", "Wine"],
    lookingFor: "A genuine person who loves good food and better conversations.",
    funFact: "I once cooked a 7-course meal for my entire apartment building.",
  },
  {
    id: "3",
    name: "Olivia",
    age: 24,
    city: "Portland",
    photos: [
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&h=1000&fit=crop",
    ],
    previewBio: "Plant mom with too many houseplants. Always have a book recommendation.",
    previewInterests: ["Reading", "Plants", "Music"],
    fullBio: "Plant mom with too many houseplants. Bookworm who always has a recommendation. Looking for someone to explore new coffee shops and indie bookstores with.",
    allInterests: ["Reading", "Plants", "Music", "Vintage", "Coffee", "Poetry"],
    lookingFor: "Someone who doesn't mind plant shopping as a date activity.",
    funFact: "I have 47 houseplants and yes, they all have names.",
  },
  {
    id: "4",
    name: "Ava",
    age: 27,
    city: "Seattle",
    photos: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&h=1000&fit=crop",
    ],
    previewBio: "Marketing creative who moonlights as a pottery enthusiast.",
    previewInterests: ["Art", "Food", "Pottery"],
    fullBio: "Marketing creative who moonlights as a pottery enthusiast. Big believer in good conversations over great food and spontaneous adventures. Making wobbly mugs is my therapy.",
    allInterests: ["Art", "Food", "Pottery", "Dance", "Marketing", "Ceramics"],
    lookingFor: "Someone creative who isn't afraid to get their hands dirty.",
    funFact: "I've made over 100 mugs and given away 99 of them.",
  },
  {
    id: "5",
    name: "Isabella",
    age: 25,
    city: "San Diego",
    photos: [
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800&h=1000&fit=crop",
    ],
    previewBio: "Startup founder who still makes time for surfing. Looking for genuine vibes.",
    previewInterests: ["Surfing", "Tech", "Fitness"],
    fullBio: "Startup founder who still makes time for surfing. Looking for someone genuine who can match my energy and share the simple moments. Sunrise surf sessions are non-negotiable.",
    allInterests: ["Surfing", "Tech", "Fitness", "Beach", "Entrepreneurship", "Wellness"],
    lookingFor: "Someone ambitious who also knows how to unplug and enjoy the moment.",
    funFact: "I pitched my startup while still in my wetsuit. Got funded.",
  },
]
