const checkInDate = document.querySelectorAll('input[name="checkInDateInput"]')[0];
const checkOutDate = document.querySelectorAll('input[name="checkOutDateInput"]')[0];

console.log(checkInDate.value);
console.log(checkOutDate.value);
const betweenDays = daysBetweenDates(checkInDate.value, checkOutDate.value);
console.log(betweenDays);

const roomTypeSpan = document.getElementById('roomType');
const totalDaysSpan = document.getElementById('totalDays');
const totalPriceDiv = document.getElementById('totalPriceDiv');
const totalPriceSpan = document.getElementById('totalPrice');

function daysBetweenDates(date1, date2) {
    const startDate = new Date(date1);
    const endDate = new Date(date2);
    
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const timeDiff = endDate.getTime() - startDate.getTime();
    
    const daysDiff = Math.round(timeDiff / millisecondsPerDay);
    return daysDiff;
  }