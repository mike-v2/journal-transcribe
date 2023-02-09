import React, { useEffect, useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const SpeechToText = (props) => {
  const [voiceText, setVoiceText] = useState("");

  const {
    transcript,
    finalTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition({
    clearTranscriptOnListen: false
  });

  useEffect(() => {
    let newText = finalTranscript.substring(voiceText.length);
    
    newText = newText.replace(/ *period/g, '.');
    newText = newText.replace(/ *comma/g, ',');
    newText = newText.replace(/ *question mark/g, '?');
    newText = newText.replace(/ *new line/g, '\n');
    newText = newText.replace(/ *semicolon/g, ';');

    //if first character is space, delete
    newText = " " + newText.trimStart();

    //capitalize first letter. Assume transcript starting at new sentence
    newText = newText.substring(0, 1).toUpperCase() + newText.substring(1);

    //capitalize first letter of sentence
    newText = newText.replace(/\. [a-z]/, function(match) {
      return match.toUpperCase();
    });

    console.log("new text = " + newText);
    setVoiceText(finalTranscript);
    props.updateVoiceText(newText);
  }, [finalTranscript])

  if (!browserSupportsSpeechRecognition) {
    return <span>Use Google Chrome for speech recognition.</span>;
  }

  function handleStartListening(e) {
    SpeechRecognition.startListening({
      continuous: true
    });
  }

  function handleStopListening(e) {
    SpeechRecognition.stopListening();
  }

  return (
    <div>
      <p>Microphone: {listening ? 'on' : 'off'}</p>
      <button onClick={handleStartListening}>Start</button>
      <button onClick={handleStopListening}>Stop</button>
      <button onClick={resetTranscript}>Reset</button>
      <textarea className='transcription-box' rows="4" cols="50" placeholder='Temp Transcription' value={transcript}></textarea>
    </div>
  );
};
export default SpeechToText;