import './App.css';
import { useEffect, useRef, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore/lite';

function App() {
  const transcriptionBox = useRef(null);
  const [image, setImage] = useState(null);
  const completedIDs = [];
  let currentID = -1;

  const firebaseConfig = {
    apiKey: "AIzaSyAc1YOLbEfxfEGeJuLonxUTCdp7HmBD2Jw",
    authDomain: "journal-transcribe.firebaseapp.com",
    projectId: "journal-transcribe",
    storageBucket: "journal-transcribe.appspot.com",
    messagingSenderId: "845025637508",
    appId: "1:845025637508:web:2d1b689bb028146ed03ed1"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  useEffect(() => {
    displayNextJournalPage();
  }, []);

  function importAll(r) {
    let images = {};
    r.keys().map(item => { images[item.replace('./', '')] = r(item); });
    return images;
  }

  //webpack stores images on build
  const images = importAll(require.context('../public/images/1948', false, /\.jpg/));
  console.log(`found ${Object.keys(images).length} images`);
  console.log(images);

  const createBlankFirebaseEntries = async (e) => {
    console.log(`creating ${Object.keys(images).length} firebase entries`);
    const year = '1948';
    for (const imageName in images) {
      const pageNumStr = imageName.split('-')[1];
      await setDoc(doc(db, 'pages', 'page-' + pageNumStr), {
        imageID: year + '-' + pageNumStr,
        isCompleted: false,
        text: "",
      });
    }
  }


  async function displayNextJournalPage() {
    const pagesRef = collection(db, 'pages');
    const pagesDocs = await getDocs(pagesRef);

    for (let i = 0; i < pagesDocs.docs.length; i++) {
      const pageData = pagesDocs.docs[i].data();
      const id = pageData.imageID;
      console.log("checking page: " + id);

      if (pageData.isCompleted === false && completedIDs.includes(id) === false) {
        currentID = id;
        console.log('current ID: ' + currentID);
        const pageNumber = currentID.split('-')[1];
        console.log("getting page number: " + pageNumber);
        setImage(images['page-' + pageNumber + '.jpg']);
        return;
      }
    }

    console.log("no more images");
  }

  async function setTranscription(text) {
    await setDoc(doc(db, 'pages', 'test-page-1'), {
      isCompleted: true,
      text: text,
    });
  }

  const handleSubmit = (e) => {
    e.preventDefault();

    setTranscription(transcriptionBox.current.value);
    completedIDs.push(currentID);
    currentID = -1;
    transcriptionBox.current.value = "";
    displayNextJournalPage();
  }

  return (
    <div className="App">
      <div className='body'>
        <div className='image-container'>
          <img src={image} className='image-box'></img>
        </div>
        <div className='form-container'>
          <form onSubmit={handleSubmit}>
            <textarea ref={transcriptionBox} className='transcription-box' name="transcription-box" rows="4" cols="50" placeholder='Enter Transcription'></textarea>
            <input className='username-box' type='text' placeholder='username' required></input>
            <input type='submit' value="Submit"></input>
            {/*
            <input type='button' value="Create New Firebase Entries" onClick={createBlankFirebaseEntries}></input>
            */}
            {completedIDs.map((id) => {
              <span>id</span>
            })}
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
