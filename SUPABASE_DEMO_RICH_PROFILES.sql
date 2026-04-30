-- Demo: long bios + many tags so locked vs unlocked is obvious in the UI.
-- Replace UUIDs if your auth users differ.

-- Bisman
update public.users
set
  tagline = 'Engineer · hiking, gaming, and calm interfaces. Coffee shops like postcards.',
  bio = 'Engineer who loves travelling, hiking, and gaming. I split my time between shipping thoughtful products and unplugging outdoors—trail runs at dawn, weekend hikes when the weather cooperates, and the occasional LAN night with friends. I am curious about design systems, calm interfaces, and how small details change how people feel. I collect coffee shops like postcards, read more non-fiction than fiction, and I am always planning the next trip: mountains first, cities second. I value direct communication, dry humor, and people who can disagree kindly. Looking for someone who can go from a museum afternoon to a spontaneous road trip without missing a beat.',
  preferences = array[
    'Engineering',
    'Travel',
    'Hiking',
    'Gaming',
    'Coffee',
    'Photography',
    'Trail running',
    'Non-fiction',
    'Design',
    'Road trips',
    'Museums',
    'Cooking'
  ]::text[],
  looking_for = 'Someone kind, curious, and up for both slow Sundays and ambitious plans.',
  fun_fact = 'Once debugged production from a chairlift—VPN and all.'
where id = 'deaf5d7b-2329-48d1-a8e1-d6a08cdf6156';

-- Shreya
update public.users
set
  tagline = 'UX · typography, galleries, and ethical product. Sketchbook always in my bag.',
  bio = 'UX designer who lives for art, typography, and the tiny interactions that make software feel human. Weekends are for gallery hops, sketching in cafés, and rearranging my bookshelf for the hundredth time. I care about inclusive design, ethical product choices, and teams that treat research as a craft—not a checkbox. I paint when I need to think, run when I need to reset, and host friends for long dinners with too many candles. I want a connection that feels easy in conversation but intentional in effort—someone who notices light, color, and kindness in equal measure.',
  preferences = array[
    'UX',
    'Art',
    'Typography',
    'Research',
    'Galleries',
    'Sketching',
    'Inclusive design',
    'Painting',
    'Running',
    'Hosting',
    'Ceramics',
    'Espresso'
  ]::text[],
  looking_for = 'A thoughtful partner who appreciates craft and conversation.',
  fun_fact = 'My favorite font changes monthly—commitment issues, but only for serifs.'
where id = '718c90bb-86a8-4950-af35-c156b393744a';
