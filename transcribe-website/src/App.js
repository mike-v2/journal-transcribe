import './App.css';
import { useEffect, useRef, useState } from 'react';
import { initializeApp } from 'firebase/app';
import SpeechToText from './SpeechToText';
import InsertDate from './InsertDate';
import { getDatabase, ref, onDisconnect, update, get } from "firebase/database";
import oldBookImage from './images/old_book_edited.png'

const year = '1948';
const minTextSize = 1;
const maxTextSize = 3;

function App() {
  const [image, setImage] = useState(null);
  const [completedIDs, setCompletedIDs] = useState({});
  const [currentID, setCurrentID] = useState("");
  const [realtimeDB, setRealtimeDB] = useState(null);
  const [startTime, setStartTime] = useState(-1);
  const [transcriptionText, setTranscriptionText] = useState('');
  const transcriptionBox = useRef(null);

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
  const images = importAll(require.context('../public/images/1948', false, /\.png/));
  console.log(`found ${Object.keys(images).length} images`);
  //console.log(images);

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    setRealtimeDB(getDatabase(app));
    
    window.addEventListener("resize", onResize);
    //on unmount
    return () => {
      console.log("Component UNMOUNTING");
    }
  }, []);

  useEffect(() => {
    onResize(null);
  }, [transcriptionBox]);

  

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
          //console.log("checking page: " + imageID);

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

          //console.log("no more images");
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
    const startSnapChars = /^\s*(period|comma|question mark|semicolon|colon|unquote)\b/;
    const endSnapChars = /\b(open parentheses|quote)\s*$/
    const startsWithSnapChar = startSnapChars.test(newText);
    const endsWithSnapChar = endSnapChars.test(currentText);
    if (startsWithSnapChar || endsWithSnapChar) {
      console.log("new text starts with snap char or old text ends with snap char. trimming end of current text");
      currentText = currentText.trimEnd();
    }

    newText = newText.replace(/\s*period\b/g, '.');
    newText = newText.replace(/\s*comma\b/g, ',');
    newText = newText.replace(/\s*question mark/g, '?');
    newText = newText.replace(/\s*semicolon\b/g, ';');
    newText = newText.replace(/\s*colon\b/g, ':');
    newText = newText.replace(/\s*unquote\b/g, '"');
    newText = newText.replace(/\s*close parentheses\b/g, ')');

    newText = newText.replace(/\bhyphen\b/g, '-');
    newText = newText.replace(/\bquote\s*/g, '"');
    newText = newText.replace(/\btab\b/g, '   ');
    newText = newText.replace(/\btab\b/g, '   ');
    newText = newText.replace(/\bopen parentheses\s*/g, '(');
    newText = newText.replace(/\bnew line\b/g, '\n');
    newText = newText.replace(/\bnew paragraph\b/g, '\n   ');

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
    r.keys().map(item => { images[item.replace('./', '').replace('.png', '')] = r(item); });
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

  const onResize = (e) => {
    //console.log("resized. window width = " + window.innerWidth);
    const widthFrac = inverseLerp(450, 1920, window.innerWidth);

    const textSize = lerp(minTextSize, maxTextSize, widthFrac);
    const percent = Math.round(textSize * 100).toString() + "%";

    if (transcriptionBox.current) {
      transcriptionBox.current.style.setProperty("--transcription-text-size", percent);
      //console.log("setting text size percent to " + percent);
    }
  }

  function inverseLerp(min, max, value) {
    return (value - min) / (max - min);
  }

  function lerp(min, max, value) {
    return value * (max - min) + min;
  }
  
  return (
    <div className="App">
      <div className='body'>
        <div className='buttons-container'>
          <SpeechToText updateVoiceText={updateVoiceText} />
          <InsertDate year={year} writeDate={writeDateToTextArea} />
          <p className='help-info'><b>Date:</b> Insert the date using the button, but only for the dates that mark the start of a journal entry. Marking the start of each entry will allow us to sort and search the entries. If Harry references a date within an entry, just copy it as it appears.</p>
          <button onClick={handleUnknownWord}>Unknown Word<br />???</button>
          <p className='help-info'><b>Unknown Word:</b> the symbol to represent a word that cannot be identified is '???'. You can use the button to insert the symbol, or you can write it manually.</p>
          <button onClick={handleArticle}>Article<br />***article***</button>
          <p className='help-info'><b>Article:</b> if there is something attached to the page, like an news article, pamphlet, photo, etc., please use the special symbol somewhere in the text. You can use the button to insert the symbol, or you can write it manually.</p>
        </div>
        
        {/*<input type='button' value="Create New Firebase Entries" onClick={createBlankFirebaseEntries}></input>
            */}

        <div className='book-container' >
          <div className='image-container'>
            <img src={oldBookImage} className='book-image' />
            <img src={image} className='page-image'></img>

            <textarea ref={transcriptionBox} className='transcription-box' name="transcription-box" placeholder='Enter Transcription' value={transcriptionText} onChange={handleTextAreaChange}></textarea>
            <input type='submit' value="Submit" onClick={handleSubmit}></input>
            {Object.keys(completedIDs).map((id) => {
              return <span className='completed-id'>{id} {getFormattedElapsedTime(completedIDs[id])}</span>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
