import {createServer} from 'node:http'
import {createReadStream} from 'node:fs'
import {Readable,Transform} from 'node:stream'
import {WritableStream,TransformStream} from 'node:stream/web'
import csvtojson from 'csvtojson'
import { setTimeout } from 'node:timers/promises'

const PORT = 3000

createServer(async (request,response) => {
    // primeiro liberamos o CORS - acesso público a nossa aplicação
    // pois nosso servidor vai rodar na porta 3000 e o front-end em outra
    const headers = {
        'Access-Control-Allow-Origin' : '*',
        'Access-Control-Allow-Methods' : '*',
    }
    if(request.method === 'OPTIONS'){
        // verifica se api esta pronta para fornecer os dados
        response.writeHead(204,headers)
        response.end()
        return;
    }
    
    let items = 0
    request.once('close',_=>console.log(`connection was closed`,items))
    // convertemos o arquivo em algo que o navegador consegue entender
    // Readable é a entrada dos dados
    Readable.toWeb(createReadStream('./animeflv.csv'))
    // pipeThrough é o passo do meio, onde cada item vai trafegar
    // usamos ela e já tiramos da memória
    .pipeThrough(Transform.toWeb(csvtojson()))
    // alem de consumir o json queremos mapea-lo
    .pipeThrough(new TransformStream({
        transform(chunk,controller){
            // o controller vai ser usado para mandar informacoes pra frente
            // com o buffer, transformamos cada linha em um chunk e conseguimos passar individualmente
            // extraindo somente oq queremos 
            const data = JSON.parse(Buffer.from(chunk).toString())
            const mappedData =
            {
                title: data.title,
                description: data.description,
                url_anime:data.url_anime,
            }
            // quebra de liha pois é um NDJSON
            controller.enqueue(JSON.stringify(mappedData).concat('\n'))
        }
    }))
    // WritableStream = saída dos dados
    // pipeTo é para a ultima etapa, para enviar os dados
    .pipeTo(new WritableStream({
        async write(chunk){
            await setTimeout(1000)
            // redireciona cada pedaço pro cliente
            items++
            response.write(chunk)
            // colhemos toda as informacoes do arquivo
        },
        close(){
            // encerra a requisição
            response.end()
        }
    }))
    // na medida que eu ler o csv, o pipe ja retorna na resposta
    
    response.writeHead(200,headers)

})

.listen(PORT)
.on('Listen',_ => console.log(`Server is running at ${PORT}`))