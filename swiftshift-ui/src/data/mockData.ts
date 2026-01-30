import type { User, Position, Location, Shift } from '../types';

export const mockLocations: Location[] = [
  { id: 1, name: "North Location", address: "123 North St, Spokane, WA" },
  { id: 2, name: "South Location", address: "456 South Ave, Spokane, WA" },
  { id: 3, name: "Valley Location", address: "789 Sullivan St, Spokane, WA" }
];

export const mockPositions: Position[] = [
  { id: 1, name: "Math Tutor", color: "#3b82f6" },
  { id: 2, name: "Littles Tutor", color: "#10b981" },
  { id: 3, name: "HS Tutor", color: "#8b5cf6" },
  { id: 4, name: "MS Tutor", color: "#f59e0b" },
  { id: 5, name: "Admin", color: "#6b7280" }
];

export const mockUsers: User[] = [
  {
    id: 1,
    first_name: "Sarah",
    last_name: "Johnson",
    email: "sarah@tutorcenter.com",
    phone_number: "555-0101",
    positions: [1, 2],
    locations: [1, 2]
  },
  {
    id: 2,
    first_name: "Mike",
    last_name: "Chen",
    email: "mike@tutorcenter.com",
    phone_number: "555-0102",
    positions: [3],
    locations: [1, 3]
  },
  {
    id: 3,
    first_name: "Emily",
    last_name: "Rodriguez",
    email: "emily@tutorcenter.com",
    phone_number: "555-0103",
    positions: [1],
    locations: [2, 3]
  },
  {
    id: 4,
    first_name: "James",
    last_name: "Williams",
    email: "james@tutorcenter.com",
    phone_number: "555-0104",
    positions: [2, 4],
    locations: [1]
  },
  {
    id: 5,
    first_name: "Lisa",
    last_name: "Brown",
    email: "lisa@tutorcenter.com",
    phone_number: "555-0105",
    positions: [3, 1],
    locations: [2, 3]
  },
  {
    id: 6,
    first_name: "David",
    last_name: "Martinez",
    email: "david@tutorcenter.com",
    phone_number: "555-0106",
    positions: [4],
    locations: [1, 2, 3]
  },
  {
    id: 7,
    first_name: "Amanda",
    last_name: "Taylor",
    email: "amanda@tutorcenter.com",
    phone_number: "555-0107",
    positions: [2],
    locations: [3]
  },
  {
    id: 8,
    first_name: "Chris",
    last_name: "Anderson",
    email: "chris@tutorcenter.com",
    phone_number: "555-0108",
    positions: [1, 3],
    locations: [1, 2]
  },
  {
    id: 9,
    first_name: "Jessica",
    last_name: "Lee",
    email: "jessica@tutorcenter.com",
    phone_number: "555-0109",
    positions: [5],
    locations: [1, 2, 3]
  },
  {
    id: 10,
    first_name: "Ryan",
    last_name: "Harris",
    email: "ryan@tutorcenter.com",
    phone_number: "555-0110",
    positions: [3, 4],
    locations: [2]
  }
];

const getMonday = (): Date => {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

export const generateWeekShifts = (): Shift[] => {
  const shifts: Shift[] = [];
  const monday = getMonday();
  let shiftId = 1;
  const openHour = 14;
  
  // Generate shifts for Mon-Fri
  for (let day = 0; day < 5; day++) {
    const currentDay = new Date(monday);
    currentDay.setDate(monday.getDate() + day);

    const closeHour = day === 4 ? 18 : 19; // Fri closes at 6pm, Mon-Thu at 7pm
    const latestStartHour = Math.max(openHour, closeHour - 1);

    // 4-7 tutors scheduled per day, each with a single continuous shift
    const tutorsPerDay = 4 + Math.floor(Math.random() * 4);
    const shuffledUsers = [...mockUsers].sort(() => Math.random() - 0.5);
    const dayTutors = shuffledUsers.slice(0, tutorsPerDay);

    dayTutors.forEach(user => {
      const locationId = user.locations[Math.floor(Math.random() * user.locations.length)];
      const positionId = user.positions[Math.floor(Math.random() * user.positions.length)];

      const startHour = openHour + Math.floor(Math.random() * (latestStartHour - openHour + 1));
      const duration = 2 + Math.floor(Math.random() * 3); // 2-4 hours
      const endHour = Math.min(startHour + duration, closeHour);

      if (endHour <= startHour) {
        return;
      }

      const start = new Date(currentDay);
      start.setHours(startHour, 0, 0, 0);
      const end = new Date(currentDay);
      end.setHours(endHour, 0, 0, 0);

      const studentNames = ["Alex M.", "Jamie L.", "Taylor K.", "Jordan P.", "Casey R."];
      const subjects = ["Algebra", "Geometry", "Calculus", "Trigonometry", "Pre-Calculus", "Algebra 2", "Calculus 2", "Trigonometry 2"];

      shifts.push({
        id: shiftId++,
        user_id: user.id,
        location_id: locationId,
        position_id: positionId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        notes: Math.random() > 0.3 ? `Student: ${studentNames[Math.floor(Math.random() * studentNames.length)]} (${subjects[Math.floor(Math.random() * subjects.length)]})` : undefined,
        published: true
      });
    });
  }
  
  return shifts;
};

export const mockShifts = generateWeekShifts();
