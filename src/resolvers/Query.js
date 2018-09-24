// ===================================================
// FEED
// ===================================================
async function feed(parent, args, context, info) {
  const where = args.filter
    ? { OR: [ { url_contains: args.filter },
              { description_contains: args.filter },
            ],}
    : {}

  const queriedLinks = await context.db.query.links(
    { where, skip: args.skip, first: args.first, orderBy: args.orderBy },
    `{ id }`,
  )

  const countSelectionSet = `
    {
      aggregate {
        count
      }
    }
  `
  const linksConnection = await context.db.query.linksConnection({}, countSelectionSet)

  return {
    count: linksConnection.aggregate.count,
    linkIds: queriedLinks.map(link => link.id),
  }
}

// ===================================================
// LINK LIST
// ===================================================
function linkList(parent, args, context, info) {
  return context.db.query.links(
    {
      where: 
      {
        url_contains: args.filter,
      },
      orderBy: args.orderBy
  }, 
  info)
}

// ===================================================
// LINK POSTED BY
// ===================================================
function linkPostedBy(parent, args, context, info) {

  return context.db.query.link(
    { where: {id: args.linkID}},
    info,
  )
}

module.exports = {
  feed,
  linkList,
  linkPostedBy,
}