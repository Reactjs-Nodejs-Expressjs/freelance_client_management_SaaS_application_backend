const mongoose = require('mongoose');
const Schedule = require('./models/Schedule');

const getKolkataHour = (d) => {
  try {
    const str = d.toLocaleTimeString("en-US", {
      timeZone: "Asia/Kolkata",
      hour12: false,
      hour: "2-digit"
    });
    return parseInt(str, 10);
  } catch (e) {
    return d.getHours();
  }
};

const getWeekDates = (date) => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const next = new Date(date);
    next.setDate(date.getDate() + i);
    dates.push(next);
  }
  return dates;
};

async function run() {
  await mongoose.connect('mongodb://localhost:27017/strategic-brand-solutions');
  const schedules = await Schedule.find({});
  
  // Set currentDate to June 8, 2026 (as in the UI screenshot)
  const currentDate = new Date("2026-06-08T00:00:00+05:30");
  const weekDates = getWeekDates(currentDate);

  console.log("Current Date of the week start:", currentDate.toString());
  console.log("Week dates:");
  weekDates.forEach(d => console.log(d.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "short", month: "short", day: "numeric" })));

  const rawBooked = [];
  const free = [];
  const maxClientsPerDay = 2; // default in UI is 2, or whatever value

  weekDates.forEach((d) => {
    // Check Morning (10 AM - 2 PM)
    const morningTasks = schedules.filter(t => {
      const tStart = new Date(t.startDate);
      const tEnd = new Date(t.endDate);
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      const isActiveOnDay = tStart < dayEnd && tEnd > dayStart;
      if (!isActiveOnDay) return false;
      
      const kStart = getKolkataHour(tStart);
      const kEnd = getKolkataHour(tEnd);
      const isMorning = kStart < 14 && kEnd > 10;
      return isMorning;
    });

    const isMorningBooked = morningTasks.length > 0;

    // Check Afternoon (3 PM - 8 PM)
    const afternoonTasks = schedules.filter(t => {
      const tStart = new Date(t.startDate);
      const tEnd = new Date(t.endDate);
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      const isActiveOnDay = tStart < dayEnd && tEnd > dayStart;
      if (!isActiveOnDay) return false;
      return getKolkataHour(tStart) < 20 && getKolkataHour(tEnd) > 15;
    });

    const isAfternoonBooked = afternoonTasks.length > 0;

    console.log(`\nDate: ${d.toDateString()}`);
    console.log(`  morningTasks count: ${morningTasks.length}, isMorningBooked: ${isMorningBooked}`);
    if (isMorningBooked) {
      console.log(`    Tasks:`, morningTasks.map(t => ({ id: t._id, title: t.title, startDate: t.startDate, endDate: t.endDate })));
    }
    console.log(`  afternoonTasks count: ${afternoonTasks.length}, isAfternoonBooked: ${isAfternoonBooked}`);

    // Calculate availability based on Capacity Limit rules
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);

    const dayTasks = schedules.filter(t => {
      const tStart = new Date(t.startDate);
      const tEnd = new Date(t.endDate);
      return tStart < dayEnd && tEnd >= dayStart;
    });

    const hasFullDay = dayTasks.some(t => {
      const start = getKolkataHour(new Date(t.startDate));
      const end = getKolkataHour(new Date(t.endDate));
      return start === 10 && end === 20;
    });

    const totalBookings = dayTasks.length;

    let morningAvailable = false;
    let afternoonAvailable = false;

    if (!hasFullDay && totalBookings < maxClientsPerDay) {
      morningAvailable = morningTasks.length === 0;
      afternoonAvailable = afternoonTasks.length === 0;
    }

    console.log(`  totalBookings: ${totalBookings}, hasFullDay: ${hasFullDay}`);
    console.log(`  morningAvailable: ${morningAvailable}, afternoonAvailable: ${afternoonAvailable}`);
  });

  process.exit(0);
}

run();
