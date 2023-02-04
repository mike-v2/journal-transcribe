import './App.css';
import { useRef } from 'react';

function App() {
  const transcriptionBox = useRef(null);


  const handleSubmit = (e) => {
    e.preventDefault();

    console.log(transcriptionBox.current.value);
  }

  return (
    <div className="App">
      <div className='body'>
        <div className='image-container'></div>
        <div className='form-container'>
          <form onSubmit={handleSubmit}>
            <textarea ref={transcriptionBox} className='transcription-box' name="transcription-box" rows="4" cols="50" placeholder='Enter Transcription'></textarea>
            <input className='username-box' type='text' placeholder='username' required></input>
            <input type='submit' value="Submit"></input>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
