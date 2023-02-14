import './App.css';
import { useEffect, useRef, useState } from 'react';
import { initializeApp } from 'firebase/app';
import SpeechToText from './SpeechToText';
import InsertDate from './InsertDate';
import { getDatabase, ref, onDisconnect, update, get } from "firebase/database";

const year = '1948';

function App() {
  const [image, setImage] = useState(null);
  const [completedIDs, setCompletedIDs] = useState({});
  const [currentID, setCurrentID] = useState("");
  const [realtimeDB, setRealtimeDB] = useState(null);
  const [startTime, setStartTime] = useState(-1);
  const [transcriptionText, setTranscriptionText] = useState('');

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
  }, [completedIDs]);

  useEffect(() => {
    if (startTime < 0) setStartTime(new Date().getTime());
  }, [transcriptionText])

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

          if (isCompleted === false && isInProgress === false && imageID in completedIDs === false) {
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

  async function setTranscription() {
    const updates = {};
    updates['pages/' + getFileNameFromImageID(currentID) + '/isCompleted'] = true;
    updates['pages/' + getFileNameFromImageID(currentID) + '/text'] = transcriptionText;
    update(ref(realtimeDB), updates);
  }

  async function releaseCurrentDocument() {
    if (currentID === "") return;

    const updates = {};
    updates['pages/' + getFileNameFromImageID(currentID) + '/isInProgress'] = false;
    update(ref(realtimeDB), updates);
  }

  const updateVoiceText = (newText) => {
    if (newText === '') return;

    console.log(`new text unedited = "${newText}"`);
    let currentText = transcriptionText;

    //delete all the leading spaces
    newText = newText.replace(/^[\s]+/, '');

    //do this before replacing punctuation, so that unquote can be differentiated from quote - unquote is a snapChar but quote is not
    const snapChars = /^\s*(period|comma|question mark|semicolon|colon|unquote)\b/;
    const startsWithSnapChar = snapChars.test(newText);
    if (startsWithSnapChar) {
      console.log("new text starts with snap char. trimming end of current text");
      currentText = currentText.trimEnd();
    }

    newText = newText.replace(/\s*period\b/g, '.');
    newText = newText.replace(/\s*comma\b/g, ',');
    newText = newText.replace(/\s*question mark/g, '?');
    newText = newText.replace(/\s*semicolon\b/g, ';');
    newText = newText.replace(/\s*colon\b/g, ':');
    newText = newText.replace(/\s*unquote\b/g, '"');

    newText = newText.replace(/\bhyphen\b/g, '-');
    newText = newText.replace(/\bquote\s?/g, '"');
    newText = newText.replace(/\btab\b/g, '   ');
    newText = newText.replace(/\bnew line\b/g, '\n');

    //capitalize first letter of sentence
    newText = newText.replace(/\. [a-z]/, function (match) {
      return match.toUpperCase();
    });

    //add a space at the start if the end of currentText is a sentence ender
    const endDoesNotNeedSpace = /[\s\b\n]$/;
    const startDoesNotNeedSpace = /^[\s\b\n]/;
    const startNeedsSpace = startDoesNotNeedSpace.test(newText) === false;
    const endNeedsSpace = endDoesNotNeedSpace.test(currentText) === false;
    console.log(`start needs space = ${startNeedsSpace}   end needs space = ${endNeedsSpace}`);
    if (currentText.length > 0 && 
        startsWithSnapChar === false &&
        startNeedsSpace &&
        endNeedsSpace) {
      newText = " " + newText;
    }
    
    const sentenceEnd = /[.?!\n]\s*$/;
    if (sentenceEnd.test(currentText)) {
      let firstLetter = newText.match(/[a-zA-Z]/);
      if (firstLetter) {
        const index = newText.indexOf(firstLetter);
        newText = newText.substring(0, index) + newText.charAt(index).toUpperCase() + newText.substring(index + 1);
      }
    }

    console.log(`new text edited = "${newText}"`);

    currentText += newText;
    setTranscriptionText(currentText);
  }

  function writeDateToTextArea(text) {
    setTranscriptionText(transcriptionText + text + "\n");
  }

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log("Completed ID: " + currentID);
    let elapsedTime = (new Date().getTime() - startTime) / 1000;
    
    setCompletedIDs({...completedIDs, [currentID]: elapsedTime});
    setTranscription();
    resetImage();
    displayNextJournalPage();
  }

  function resetImage() {
    releaseCurrentDocument();
    setTranscriptionText('');
    setCurrentID('');
    setStartTime(-1);
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

  const handleUnknownWord = (e) => {
    e.preventDefault();

    setTranscriptionText(transcriptionText + "???");
  }

  const handleArticle = (e) => {
    e.preventDefault();

    setTranscriptionText(transcriptionText + "***article***");
  }

  const handleTextAreaChange = (e) => {
    setTranscriptionText(e.target.value);
  }

  function getFormattedElapsedTime(time) {
    let minutes = Math.floor(time / 60);
    let seconds = time % 60;
    seconds -= time % 1;
    let secStr = seconds.toString();
    if (seconds < 10) {
      secStr = '0' + secStr;
    }
    return minutes.toString() + ':' + secStr;
  }
  
  return (
    <div className="App">
      <div className='body'>
        <div className='image-container'>
          <img src={image} className='image-box'></img>
        </div>
        <div className='form-container'>
          <InsertDate year={year} writeDate={writeDateToTextArea} />
          <button onClick={handleUnknownWord}>Unknown Word<br />???</button>
          <button onClick={handleArticle}>Article<br />***article***</button>

          <SpeechToText updateVoiceText={updateVoiceText} />
          {/*<input type='button' value="Create New Firebase Entries" onClick={createBlankFirebaseEntries}></input>
            */}

          <textarea className='transcription-box' name="transcription-box" rows="20" cols="50" placeholder='Enter Transcription' value={transcriptionText} onChange={handleTextAreaChange}></textarea>
          <input type='submit' value="Submit" onClick={handleSubmit}></input>
          {Object.keys(completedIDs).map((id) => {
            return <span className='completed-id'>{id} {getFormattedElapsedTime(completedIDs[id])}</span>;
          })}
        </div>
      </div>
    </div>
  );
}

export default App;
