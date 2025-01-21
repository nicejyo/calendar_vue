import axios from "axios"

export default{
  async getId() {
    const res = await axios.get("/api/id");
    return res.data;
  },

  async read(day) {
    const res = await axios.get(`/api/event/${day}`);
    return res.data;
  },

  async save(params) {
    const res = await axios.post("/api/save", params);
    return res.status == 201;
  },

  async put(params) {
    const res = await axios.put("/api/put", params);
    return res.status == 200;
  },

  async delete(id) {
    const res = await axios.delete(`/api/delete/${id}`);
    return res.status == 200;
  },

}