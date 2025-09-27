import {Devvit} from "@devvit/public-api";

import {Scope} from "@devvit/protos";

Devvit.configure({
    redditAPI: true,
    userActions: {scopes: [Scope.SUBMIT_COMMENT]}
});

const tjaSourceAsk = 'Hallo OP, vielen Dank für deinen Beitrag. \nBitte kommentiere hier die Quelle, deines tja. Dann wird der Post auch automatisch akzeptiert.'
const tjaSourceThere = 'Klapp\' die Antworten auf diesen Kommentar auf, um zur Quelle des tja zu kommen.'

Devvit.addTrigger({
    event: "PostSubmit",
    async onEvent(event, context) {
        const post = event.post
        if (post === undefined) {
            return;
        }
        const id = post.id;
        const flair = post.linkFlair;
        if (id === undefined || flair === undefined) {
            return;
        }
        if (post.title.toLowerCase() == 'tja' && flair.text == "Aus den Nachrichten") {
            const body = post.selftext.toLowerCase()
            if (body.includes("http") || body.includes("www")) {
                const po = await context.reddit.getPostById(post.id)
                await po.approve()
            } else {
                const comment = await context.reddit.submitComment({
                    id: id,
                    text: tjaSourceAsk,
                    runAs: "USER"
                })
                await comment.distinguish(true)
            }
        }
    }
})

Devvit.addTrigger({
    event: "CommentCreate",
    async onEvent(event, context) {
        const comment = event.comment
        const post = event.post
        if (post === undefined || comment === undefined) {
            return;
        }
        if (comment.author === post.authorId) {
            console.log("User is OP")
            if (comment.parentId.startsWith("t1_")) {
                const botComment = await context.reddit.getCommentById(comment.parentId)
                if (botComment.body === tjaSourceAsk) {
                    await botComment.lock()
                    const po = await context.reddit.getPostById(post.id)
                    await po.approve()
                    await botComment.edit({text: tjaSourceThere})
                }
            }
        } else {
            console.log("Error comment author is not OP")
        }
    }
})

export default Devvit;
