import './App.css';
import { useEffect, useRef, useState } from 'react';
import { initializeApp } from 'firebase/app';
import SpeechToText from './SpeechToText';
import InsertDate from './InsertDate';

import { getDatabase, ref, onDisconnect, update, get } from "firebase/database";

const year = '1948';

function App() {
  const transcriptionBox = useRef(null);
  const [image, setImage] = useState(null);
  const [completedIDs, setCompletedIDs] = useState([]);
  const [currentID, setCurrentID] = useState("");
  const [realtimeDB, setRealtimeDB] = useState(null);
  const [skippedIDs, setSkippedIDs] = useState([]);

  const firebaseConfig = {
    apiKey: "AIzaSyAc1YOLbEfxfEGeJuLonxUTCdp7HmBD2Jw",
    authDomain: "journal-transcribe.firebaseapp.com",
    projectId: "journal-transcribe",
    storageBucket: "journal-transcribe.appspot.com",
    messagingSenderId: "845025637508",
    appId: "1:845025637508:web:2d1b689bb028146ed03ed1",
    databaseURL: "https://journal-transcribe-default-rtdb.firebaseio.com"
  };

  //webpack stores images on build
  const images = importAll(require.context('../public/images/1948', false, /\.jpg/));
  //console.log(`found ${Object.keys(images).length} images`);
  //console.log(images);

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    setRealtimeDB(db);
    
    //on unmount
    return () => {
      console.log("Component UNMOUNTING");
    }
  }, []);

  useEffect(() => {
    if (realtimeDB && currentID === "") {
      displayNextJournalPage();
    }
  }, [realtimeDB]);

  useEffect(() => {
    if (realtimeDB) {
      resetImage();
      displayNextJournalPage();
    }
  }, [skippedIDs, completedIDs]);

  async function displayNextJournalPage() {
    const pagesRef = ref(realtimeDB, '/pages/');

    get(pagesRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log(data);

        for (let page in data) {
          const imageID = data[page].imageID;
          const isCompleted = data[page].isCompleted;
          const isInProgress = data[page].isInProgress;
          console.log("checking page: " + imageID);

          if (isCompleted === false && isInProgress === false && completedIDs.includes(imageID) === false && skippedIDs.includes(imageID) === false) {
            console.log("Setting current id: " + imageID);
            setCurrentID(imageID);
            const pageNumber = getPageNumberFromImageID(imageID);
            console.log(`getting page number ${pageNumber}: ${images[getFileNameFromImageID(imageID)]}`);

            const updates = {};
            updates['pages/' + getFileNameFromImageID(imageID) + '/isInProgress'] = true;
            update(ref(realtimeDB), updates);

            const isInProgressRef = ref(realtimeDB, 'pages/' + getFileNameFromImageID(imageID) + '/isInProgress');
            onDisconnect(isInProgressRef).set(false);

            setImage(images[getFileNameFromPageNumber(pageNumber)]);
            return;
          }

          console.log("no more images");
        }
      }
    })
  }

  async function setTranscription(text) {
    const updates = {};
    updates['pages/' + getFileNameFromImageID(currentID) + '/isCompleted'] = true;
    updates['pages/' + getFileNameFromImageID(currentID) + '/text'] = text;
    update(ref(realtimeDB), updates);
  }

  async function releaseCurrentDocument() {
    if (currentID === "") return;

    const updates = {};
    updates['pages/' + getFileNameFromImageID(currentID) + '/isInProgress'] = false;
    update(ref(realtimeDB), updates);
  }

  const updateVoiceText = (text) => {
    transcriptionBox.current.value += text;
  }

  function writeDateToTextArea(text) {
    transcriptionBox.current.value += text;
    transcriptionBox.current.value += "\n";
  }

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log("Completed ID: " + currentID);
    setCompletedIDs([...completedIDs, currentID]);
    setTranscription(transcriptionBox.current.value);
    resetImage();
    displayNextJournalPage();
  }

  function resetImage() {
    releaseCurrentDocument();
    transcriptionBox.current.value = "";
    setCurrentID("");
  }

  const handleSkip = (e) => {
    if (currentID !== "") {
      console.log("Skipping id: " + currentID);
      //setting skippedIDs triggers useEffect
      setSkippedIDs([...skippedIDs, currentID]);
    }
  }

  const handleKeydown = (e) => {
    
  }

  function getFileNameFromPageNumber(pageNumber) {
    return 'page-' + pageNumber;
  }

  function getPageNumberFromImageID(id) {
    return id.split('-')[1]
  }

  function getFileNameFromImageID(id) {
    return getFileNameFromPageNumber(getPageNumberFromImageID(id));
  }

  function importAll(r) {
    let images = {};
    r.keys().map(item => { images[item.replace('./', '').replace('.jpg', '')] = r(item); });
    return images;
  }

  const createBlankFirebaseEntries = async (e) => {
    console.log(`creating ${Object.keys(images).length} firebase entries`);
    
    for (const imageID in images) {
      const pageNumStr = getPageNumberFromImageID(imageID);
      // set(ref(realtimeDB, 'pages/' + getFileNameFromPageNumber(pageNumStr)), {
      //   imageID: year + '-' + pageNumStr,
      //   isCompleted: false,
      //   isInProgress: false,
      //   completedByUser: "",
      //   text: "",
      // });

      const updates = {};
      updates['pages/' + getFileNameFromPageNumber(pageNumStr) + '/isInProgress'] = false;
      update(ref(realtimeDB), updates);
    }
  }

  return (
    <div className="App">
      <div className='body'>
        <div className='image-container'>
          <img src={image} className='image-box'></img>
        </div>
        <div className='form-container'>
          <form onSubmit={handleSubmit}>
            <input className='username-box' type='text' placeholder='username' required></input>
            <input type='button' value='Skip' onClick={handleSkip}></input>
            <input type='submit' value="Submit"></input>
            <InsertDate year={year} writeDate={writeDateToTextArea}/>
            {/*<input type='button' value="Create New Firebase Entries" onClick={createBlankFirebaseEntries}></input>
            */}

            <textarea ref={transcriptionBox} className='transcription-box' name="transcription-box" rows="20" cols="50" placeholder='Enter Transcription' onKeyDown={handleKeydown}></textarea>

            {completedIDs.map((id) => {
              return <span className='completed-id'>{id}</span>;
            })}
          </form>
          <SpeechToText updateVoiceText={updateVoiceText}/>
        </div>
      </div>
    </div>
  );
}

export default App;
