import "./InsertDate.css"
import { useState } from "react";


const InsertDate = (props) => {
  const { year, writeDate } = props;

  const [month, setMonth] = useState("Month");
  const [day, setDay] = useState("1");

  const handleInsertDate = (e) => {
    const date = "***" + month + ". " + day + " " + year + "***";
    writeDate(date);
  }

  const handleMonthChange = (e) => {
    setMonth(e.target.value);
  }

  const handleDayChange = (e) => {
    const number = Number(e.target.value);
    
    if (number > 31) number = 31;

    setDay(number.toString());
  }

  return (
    <div>
      <select value={month} onChange={handleMonthChange}>
        <option value="Month" disabled>Month</option>
        <option value="Jan">Jan</option>
        <option value="Feb">Feb</option>
        <option value="Mar">Mar</option>
        <option value="Apr">Apr</option>
        <option value="May">May</option>
        <option value="Jun">Jun</option>
        <option value="Jul">Jul</option>
        <option value="Aug">Aug</option>
        <option value="Sep">Sep</option>
        <option value="Oct">Oct</option>
        <option value="Nov">Nov</option>
        <option value="Dec">Dec</option>
      </select>
      <input type='text' id="day-box" value={day} focu onChange={handleDayChange} maxLength='2'></input>
      <input type='text' id="year-box" value={year} disabled></input>
      <input type='button' onClick={handleInsertDate} value='Insert Date'></input>
    </div>
  );
}

export default InsertDate;