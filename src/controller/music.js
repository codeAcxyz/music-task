const Music = require("../schema/musicSchema");
const SoundCloud = require("soundcloud-scraper");
const client = new SoundCloud.Client("vvWDsm284DNe9CDlRlfb3wuseloIl1RS");
const { resp } = require("../utility/resp");
exports.addMusic = async (req, res) => {
  try {
    const isExist = await Music.findOne({
      musicId: req.body.musicId,
    });
    if (isExist) {
      return resp.taken(res, "");
    }
    const music = await Music.create(req.body);
    return resp.success(res, "", music);
  } catch (error) {
    return resp.fail(res, "");
  }
};
exports.updateMusic = async (req, res) => {
  try {
    let isUpdated = await Music.findByIdAndUpdate(_id, req.body);
    if (!isUpdated) {
      return resp.notFound(res, "Music not found");
    }
    return resp.success(res, "");
  } catch (error) {
    return resp.fail(res, "");
  }
};
exports.deleteMusic = async (req, res) => {
  try {
    let isDeleted = await Music.findByIdAndDelete(_id, req.body);
    if (!isDeleted) {
      return resp.notFound(res, "Music not found");
    }
    return resp.success(res, "");
  } catch (error) {
    return resp.fail(res, "");
  }
};
exports.searchMusic = async (req, res) => {
  try {
    const searchKeyword = req.query.search;
    const searchQuery = { $regex: searchKeyword, $options: "i" };
    let allSavedMusic = await Music.find({
      $or: [
        { title: searchQuery },
        { author: searchQuery },
        { description: searchQuery },
      ],
    });
    if (allSavedMusic.length > 0) {
      resp.success(res, "", allSavedMusic);
    }
    const results = await client.search(searchKeyword);
    if (!results.length > 0) {
      return resp.unknown(res, "Invalid query");
    }
    const promises = results.map(async (firstResult) => {
      const trackInfo = await client.getSongInfo(firstResult.url);
      const structuredData = {
        title: trackInfo.title,
        description: trackInfo.description,
        thumbnail: trackInfo.thumbnail,
        duration: trackInfo.duration,
        url: trackInfo.embedURL,
        genre: trackInfo.genre,
        musicId: trackInfo.id,
        commentsCount: trackInfo.commentsCount,
        likes: trackInfo.likes,
        playCount: trackInfo.playCount,
        publishedAt: trackInfo.publishedAt,
        author: trackInfo.author,
        streamUrl: trackInfo.streams.hls,
      };
      const updatedMusic = await Music.findOneAndUpdate(
        { musicId: structuredData.musicId },
        structuredData,
        { upsert: true }
      ).lean(true);
      return updatedMusic;
    });
    const data = await Promise.allSettled(promises);
    const resolvedPromises = data
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);
    if (!allSavedMusic.length > 0) {
      return resp.success(res, "", resolvedPromises);
    }
  } catch (error) {
    return resp.fail(res, "");
  }
};
