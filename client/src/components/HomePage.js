import { useNavigate } from "react-router-dom";

function HomePage() {
    const navigate = useNavigate();
    function pickSide() {
      if (Math.random() < 0.5) {
        navigate("/game",{state:{isPlayerTurn:true,orientation:'white'}});
      } else {
        navigate("/game",{state:{isPlayerTurn:false,orientation:'black'}});
      }
    }

    return (
      <div>
        <h1>Start Game</h1>
        <button onClick={() => {pickSide()}}>
            Start Game
          </button>
      </div>
    );
  }

export default HomePage;