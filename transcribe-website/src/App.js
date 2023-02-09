import './App.css';
import { useEffect, useRef, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDoc, getDocs, doc, setDoc } from 'firebase/firestore/lite';
import SpeechToText from './SpeechToText';

function App() {
  const transcriptionBox = useRef(null);
  const [image, setImage] = useState(null);
  const [completedIDs, setCompletedIDs] = useState([]);
  const [currentID, setCurrentID] = useState("");
  const [db, setDB] = useState(null);
  const [skippedIDs, setSkippedIDs] = useState([]);

  const firebaseConfig = {
    apiKey: "AIzaSyAc1YOLbEfxfEGeJuLonxUTCdp7HmBD2Jw",
    authDomain: "journal-transcribe.firebaseapp.com",
    projectId: "journal-transcribe",
    storageBucket: "journal-transcribe.appspot.com",
    messagingSenderId: "845025637508",
    appId: "1:845025637508:web:2d1b689bb028146ed03ed1"
  };

  //webpack stores images on build
  const images = importAll(require.context('../public/images/1948', false, /\.jpg/));
  //console.log(`found ${Object.keys(images).length} images`);
  //console.log(images);

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const database = getFirestore(app);
    setDB(database);
    
    //on unmount
    return () => {
      console.log("Component UNMOUNTING");
    }
  }, []);

  useEffect(() => {
    if (db && currentID === "") {
      displayNextJournalPage();
    }
  }, [db]);

  useEffect(() => {
    if (db) {
      resetImage();
      displayNextJournalPage();
    }
  }, [skippedIDs, completedIDs]);

  async function displayNextJournalPage() {
    const pagesRef = collection(db, 'pages');
    const pagesDocs = await getDocs(pagesRef);

    for (let i = 0; i < pagesDocs.docs.length; i++) {
      const pageData = pagesDocs.docs[i].data();
      const id = pageData.imageID;
      console.log("checking page: " + id);

      if (pageData.isCompleted === false && completedIDs.includes(id) === false && skippedIDs.includes(id) === false /* && pageData.isInProgress === false */) {
        console.log("Setting current id: " + id);
        setCurrentID(id);
        const pageNumber = getPageNumberFromImageID(id);
        console.log(`getting page number ${pageNumber}: ${images[getFileNameFromImageID(id)]}`);

        // const docName = getFileNameFromImageID(id);
        // await setDoc(doc(db, 'pages', docName), {
        //   isInProgress: true
        // }, { merge: true });

        //const isInProgressField = firebase.database().ref("isInProgress");
        //isInProgressField.onDisconnect().set(false);
        
        setImage(images[getFileNameFromPageNumber(pageNumber)]);
        return;
      }
    }

    console.log("no more images");
  }

  async function setTranscription(text) {
    const docName = getFileNameFromImageID(currentID);
    await setDoc(doc(db, 'pages', docName), {
      isCompleted: true,
      text: text,
    }, {merge: true});
  }

  async function releaseCurrentDocument() {
    if (currentID === "") return;

    const docName = getFileNameFromImageID(currentID);
    await setDoc(doc(db, 'pages', docName), {
      isInProgress: false,
    }, { merge: true });
  }

  const updateVoiceText = (text) => {
    transcriptionBox.current.value += text;
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
    //add new entries
    /*
    console.log(`creating ${Object.keys(images).length} firebase entries`);
    const year = '1948';
    for (const imageID in images) {
      const pageNumStr = getPageNumberFromImageID(imageID);
      await setDoc(doc(db, 'pages', 'page-' + pageNumStr), {
        imageID: year + '-' + pageNumStr,
        isCompleted: false,
        text: "",
      });
    }
    */

    //edit entries
    /* 
    for (const imageID in images) {
      const pageNumStr = getPageNumberFromImageID(imageID);
      await setDoc(doc(db, 'pages', 'page-' + pageNumStr), {
        
      }, { merge: true });
    } 
    */
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
            <textarea ref={transcriptionBox} className='transcription-box' name="transcription-box" rows="20" cols="50" placeholder='Enter Transcription' onKeyDown={handleKeydown}></textarea>
            
            {/*
                        <input type='button' value="Create New Firebase Entries" onClick={createBlankFirebaseEntries}></input>
            */}
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
