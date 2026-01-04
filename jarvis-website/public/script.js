const statusDiv = document.getElementById('status');
const conversationLog = document.getElementById('conversation-log');
const textInput = document.getElementById('text-input');
const micButton = document.getElementById('mic-button');
const sendButton = document.getElementById('send-button');

let recognition;
let isListening = false;

// --- 1. THE VOICE (Text to Speech) ---
function speak(text) {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.rate = 1.0; 
    utterance.pitch = 0.9; 

    utterance.onstart = () => {
        statusDiv.innerText = "Assistent Speaking...";
        // Safety: Ensure mic is OFF so Jarvis doesn't hear himself
        if (isListening) recognition.stop(); 
    };

    utterance.onend = () => {
        statusDiv.innerText = "Ready for next command";
        // THE LOOP: Automatically restart listening after speaking
        startListening(); 
    };

    synth.speak(utterance);
}

// --- 2. THE EARS (Speech to Text) ---
if (window.SpeechRecognition || window.webkitSpeechRecognition) {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = false; // We use false for better "command-response" accuracy
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        isListening = true;
        statusDiv.innerText = "Assistant is listening...";
        micButton.style.backgroundColor = '#ff5722'; // Pulse Orange
    };

    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        textInput.value = transcript;
        isListening = false;
        
        // Trigger the RAG system
        await processCommand(transcript);
    };

    recognition.onend = () => {
        isListening = false;
        micButton.style.backgroundColor = '#005f7a'; // Back to Blue
    };

    recognition.onerror = (event) => {
        console.error("Mic error:", event.error);
        // If it times out from silence, restart the loop
        if (event.error === 'no-speech') startListening();
    };
}

// --- 3. SYSTEM CONTROLS ---
function startListening() {
    if (!window.speechSynthesis.speaking && !isListening) {
        try {
            recognition.start();
        } catch (e) { /* Already started */ }
    }
}

async function processCommand(text) {
    if (!text) return;

    // Display User Text
    conversationLog.innerHTML += `<div class="user-message">You: ${text}</div>`;
    conversationLog.scrollTop = conversationLog.scrollHeight;

    statusDiv.innerText = "Assistant is accessing the database...";

    try {
        // CALL YOUR RAG BACKEND
        const response = await fetch('http://localhost:3000/ask-jarvis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ textInput: text })
        });

        const data = await response.json();
        const jarvisReply = data.reply;

        if (!jarvisReply || jarvisReply === 'undefined') {
    speak('Sir, your daily quota is exhausted.');
        }else{
     // Display Jarvis Text
        conversationLog.innerHTML += `<div class="jarvis-message">Assistent: ${jarvisReply}</div>`;
        conversationLog.scrollTop = conversationLog.scrollHeight;

        // Jarvis speaks (This triggers utterance.onend to restart the mic)
        speak(jarvisReply);
        }

    } catch (error) {
        speak("Sir, I am unable to connect to the RAG system.");
    }
}

// UI Event Listeners
micButton.onclick = () => {
    if (!isListening) startListening();
    else recognition.stop();
};

sendButton.onclick = () => processCommand(textInput.value);

textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') processCommand(textInput.value);
});

// Initial Wake-up
window.onload = () => {
    statusDiv.innerText = "Company Assistant Systems Online. Click Mic to begin.";
    micButton.disabled = false;
    textInput.disabled = false;
    sendButton.disabled = false;
};