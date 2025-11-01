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
        const postV2 = event.post
        if (postV2 === undefined) {
            return;
        }
        const id = postV2.id;
        const flair = postV2.linkFlair;
        if (id === undefined || flair === undefined) {
            return;
        }
        const post = await context.reddit.getPostById(postV2.id)
        const comment = await post.comments.all()
        if (comment.filter(comment => (comment.authorName == "tja-tja" || comment.authorName == "AutoModerator")).length > 0) {
            console.log(comment)
            return;
        }
        if (comment.filter(comment => (comment.authorName == "AutoModerator")).length > 0) {
            console.log(comment)
            return;
        }
        if (postV2.title.toLowerCase() == 'tja' && flair.text == "Aus den Nachrichten") {
            const body = postV2.selftext.toLowerCase()
            if (body.includes("http") || body.includes("www")) {
                const po = await context.reddit.getPostById(postV2.id)
                await po.approve()
                console.log("Post approved")
            } else {
                const comment = await context.reddit.submitComment({
                    id: id,
                    text: tjaSourceAsk,
                    runAs: "USER"
                })
                await comment.distinguish(true)
                console.log("Asking User for Source")
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
            if (comment.author === "AutoModerator") {
                const botComment = await context.reddit.getCommentById(comment.parentId)
                if (botComment.body === tjaSourceAsk) {
                    await botComment.delete()
                }
            } 
        }
    }
})

export default Devvit;
