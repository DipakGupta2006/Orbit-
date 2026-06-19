

(
    
    function () {
        
        


    const chatInput = document.getElementById("chatInput");

    const sendBtn = document.getElementById("sendBtn");

    const messageArea = document.getElementById("messageArea");



    let chatHistory =
        JSON.parse(localStorage.getItem("orbit_chat")) || [];





    // Load old messages when page refresh

    function loadMessages() {


        messageArea.innerHTML = "";


        chatHistory.forEach(msg => {


            createMessage(
                msg.text,
                msg.role
            );


        });


    }





    loadMessages();






    // Create message UI

    function createMessage(text, role) {


        const div =
            document.createElement("div");



        div.className =
            "message-item " + role;



        div.textContent = text;



        messageArea.appendChild(div);



    }







    // Save message in local storage

    function saveMessage(text, role) {


        chatHistory.push({

            text: text,

            role: role,

            time: new Date().toISOString()

        });



        localStorage.setItem(

            "orbit_chat",

            JSON.stringify(chatHistory)

        );


    }







    function appendMessage(text, role) {



        createMessage(
            text,
            role
        );


        saveMessage(
            text,
            role
        );



        setTimeout(() => {


            messageArea.scrollTop =
                messageArea.scrollHeight;


        }, 50);



    }








    sendBtn.addEventListener(
        "click",
        sendMessage
    );




    chatInput.addEventListener(
        "keypress",
        (e) => {


            if (e.key === "Enter") {

                sendMessage();

            }


        });







    async function sendMessage() {



        const message =
            chatInput.value.trim();



        if (!message)
            return;



        // user message

        appendMessage(
            message,
            "user"
        );



        chatInput.value = "";



        sendBtn.disabled = true;

        sendBtn.innerText = "Thinking...";




        try {


            const response =
                await fetch("/api/chat", {


                    method: "POST",


                    headers: {


                        "Content-Type":
                            "application/json"


                    },


                    body: JSON.stringify({

                        message: message

                    })


                });





            const data =
                await response.json();





            appendMessage(

                data.reply ||
                "No response",

                "assistant"

            );




        }
        catch (error) {



            appendMessage(

                "Network error",

                "assistant"

            );


        }
        finally {


            sendBtn.disabled = false;


            sendBtn.innerText = "🚀 Send";


        }




    }







})();