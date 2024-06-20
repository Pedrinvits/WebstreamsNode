const API_URL = 'http://localhost:3000'

async function consumeApi(signal){
    const response = await fetch(API_URL,{
        signal
    })
    const counter = 0
    const reader = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(parseNDJSON())
    // .pipeTo(new WritableStream({
    //     write(chunk){
    //         console.log(counter);
    //         console.log(chunk);
    //     }
    // }))
    return reader
}
function parseNDJSON(){
    // essa funcao garante que caso dois chunks cheguem em uma unica trasmissao
    // converta corretamente para json => se chegar assim {}\n{}, fica assim {},{}
    let ndjsonbuffer = ''
    return new TransformStream({
        transform(chunk,controller){
            // se o json vier todo picotado, nos precisamos guarda-lo na memoria ate juntar informacao suficiente pra parsear com outro json
            // agrupando os dados do mesmo chunk (linha do csv), no momento que identifica que a linha acabou limpamos e vamos para a proxima linha garantindo que parsiamos da forma certa 
            ndjsonbuffer += chunk
            const items = ndjsonbuffer.split('\n')
            items.slice(0,-1)
            .forEach(item => controller.enqueue(JSON.parse(item)))
            ndjsonbuffer = items[items.length -1]
        },
        flush(controller){
            // quando terminou de processar, se ficou alguma informacao parada
            if(!ndjsonbuffer)return
            controller.enqueue(JSON.parse(ndjsonbuffer))
        }
    })
}
function appendToHTML(el) {
    return new WritableStream({
       write({ title, description, url_anime }) {
        const card = `
          <article>
            <div class="text">
              <h3>[${++counter}] ${title}</h3>
              <p>${description.slice(0, 100)}</p>
              <a href="${url_anime}">Here's why</a>
            </div>
          </article>
          `
        el.innerHTML += card
      },
      abort(reason) {
        console.log('aborted**', reason)
      }
    })
  }
const [
    start,
    stop,
    cards
  ] = ['start', 'stop', 'cards']
    .map(
      id => document.getElementById(id)
    )

let abortController = new AbortController()
let counter = 0
start.addEventListener('click', async () => {
  const reader = await consumeApi(abortController.signal)
  reader.pipeTo(appendToHTML(cards))
})

stop.addEventListener('click', () => {
  abortController.abort()
  console.log('aborting...')
  abortController = new AbortController()
})

