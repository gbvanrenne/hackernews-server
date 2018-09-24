const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { APP_SECRET, getUserId } = require('../utils')

// Extract the userId from the Authorization header of the request and use it 
// to directly connect it with the Link that’s created. 
// Note that getUserId will throw an error if the field is not provided or not 
// valid token could be extracted.
function post(parent, { url, description }, ctx, info) {
  const userId = getUserId(ctx)
  return ctx.db.mutation.createLink(
    { data: { url, description, postedBy: { connect: { id: userId } } } },
    info,
  )
}

// ---------------------------------------------------------------
// EDIT LINK MUTATION
// ---------------------------------------------------------------
async function editLink(parent, args, ctx, info) {

  const userId = await getUserId(ctx)
  console.log ("userId:    ", userId)
  
  const postedByUserId = await ctx.db.query.link(
    { where: {id: args.linkID}},
    `{ postedBy {id} }`,
  )
  console.log ("posted by: ", postedByUserId.postedBy.id)

  try 
  {
    if (postedByUserId.postedBy.id != userId) 
    {
      throw new Error("Not authorized to edit this entry.")
    }

    return ctx.db.mutation.updateLink(
      { data: { 
                url: args.url, 
                description: args.description, 
                postedBy: { connect: { id: userId } } 
              },
        where: {id: args.linkID}
      },
      info,
      // `{id url description postedBy {id}}`,
    )
  }
  catch (e)
  {
    console.log (e.message)
  }
}

// ---------------------------------------------------------------
// SIGNUP MUTATION
// ---------------------------------------------------------------
async function signup(parent, args, ctx, info) {
  const password = await bcrypt.hash(args.password, 10)
  const user = await ctx.db.mutation.createUser({
    data: { ...args, password },
  })

  const token = jwt.sign({ userId: user.id }, APP_SECRET)

  return {
    token,
    user,
  }
}

// ---------------------------------------------------------------
// LOGIN MUTATION
// ---------------------------------------------------------------
async function login(parent, args, ctx, info) {

  console.log("Logging in...")
  const user = await ctx.db.query.user({ where: { email: args.email } })

  try {
    if (!user) {
      let errMsg = "User not found"
      throw new Error(errMsg)
    }

    const valid = await bcrypt.compare(args.password, user.password)
    if (!valid) {
      let errMsg = "Invalid password"
      throw new Error(errMsg)
    }

    return {
      token: jwt.sign({ userId: user.id }, APP_SECRET),
      user,
    }
  } catch(e) {
    console.log(e.message)
    return {
      token: null,
      user,
    }
  }
}

// ---------------------------------------------------------------
// VOTE MUTATION
// ---------------------------------------------------------------
async function vote(parent, args, ctx, info) {
  const { linkId } = args
  const userId = getUserId(ctx)
  const linkExists = await ctx.db.exists.Vote({
    user: { id: userId },
    link: { id: linkId },
  })
  if (linkExists) {
    throw new Error(`Already voted for link: ${linkId}`)
  }

  return ctx.db.mutation.createVote(
    {
      data: {
        user: { connect: { id: userId } },
        link: { connect: { id: linkId } },
      },
    },
    info,
  )
}

module.exports = {
  post,
  editLink,
  signup,
  login,
  vote,
}
